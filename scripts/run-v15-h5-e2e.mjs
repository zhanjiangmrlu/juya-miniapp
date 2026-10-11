/* global localStorage */
import { log } from 'node:console'
import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const output =
  process.env.JUYA_QA_OUTPUT_DIR || path.join(repo, '.v15-artifacts.local/http-browser')
const results = {
  scope: 'REAL_UI_HTTP_NO_MOCK',
  steps: [],
  requests: [],
  viewports: [],
  network_failures: [],
  page_errors: 0
}
let browser
let captureFailure
const pending = new Set()
let currentStep = 'environment'
/** 环境校验失败仅输出字段名，避免异常携带凭证 */
const required = (name) => {
  if (!process.env[name]) throw new Error(`MISSING_${name}`)
  return process.env[name]
}
/** 校验服务地址，value为确认的HTTP入口，不允许夹带身份或查询 */
const serviceUrl = (value) => {
  const url = new URL(value)
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error('INVALID_SERVICE_URL')
  return url
}
try {
  const base = serviceUrl(required('JUYA_QA_BASE_URL'))
  const h5 = serviceUrl(required('JUYA_QA_H5_URL'))
  const accessToken = required('JUYA_QA_ACCESS_TOKEN')
  const refreshToken = required('JUYA_QA_REFRESH_TOKEN')
  const entities = JSON.parse(required('JUYA_QA_ENTITIES'))
  if (!entities.scene_id) throw new Error('MISSING_SCENE_ID')
  const require = createRequire(path.resolve(repo, '../juya-admin/package.json'))
  const { chromium, expect } = require(
    path.resolve(repo, '../juya-admin/node_modules/@playwright/test')
  )
  browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  // 合法隔离会话仅进入全新浏览器内存/本地存储，不保存storageState或HAR
  await context.addInitScript(
    ({ access, refresh, origin }) => {
      if (globalThis.location.origin !== origin) return
      if (!localStorage.getItem('juya.qa-session-initialized')) {
        localStorage.setItem('juya.access-token', access)
        localStorage.setItem('juya.refresh-token', refresh)
        localStorage.setItem('juya.qa-session-initialized', 'true')
      }
    },
    { access: accessToken, refresh: refreshToken, origin: h5.origin }
  )
  const page = await context.newPage()
  const inFlight = new Set()
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/v1/')) inFlight.add(request)
  })
  page.on('requestfinished', (request) => inFlight.delete(request))
  page.on('pageerror', () => {
    results.page_errors++
  })
  page.on('requestfailed', (request) => {
    inFlight.delete(request)
    const url = new URL(request.url())
    if (!url.pathname.startsWith('/api/v1/')) return
    results.network_failures.push({
      step: currentStep,
      method: request.method(),
      path: url.pathname,
      expected_origin: url.origin === base.origin || url.origin === h5.origin,
      failure_kind: request.failure()?.errorText.includes('ABORTED') ? 'ABORTED' : 'NETWORK_ERROR'
    })
  })
  page.on('response', (response) => {
    const url = new URL(response.url())
    if (!url.pathname.startsWith('/api/v1/')) return
    const task = (async () => {
      const data = await response.json().catch(() => undefined)
      results.requests.push({
        step: currentStep,
        method: response.request().method(),
        path: url.pathname,
        expected_origin: url.origin === base.origin || url.origin === h5.origin,
        transport:
          url.origin === base.origin
            ? 'DIRECT_BFF'
            : url.origin === h5.origin
              ? 'H5_PROXY'
              : 'UNEXPECTED_ORIGIN',
        status: response.status(),
        request_id:
          typeof data?.request_id === 'string'
            ? data.request_id
            : response.headers()['x-request-id'],
        fields: data && typeof data === 'object' && !Array.isArray(data) ? Object.keys(data) : [],
        error_code: response.ok()
          ? undefined
          : typeof data?.code === 'string'
            ? data.code
            : 'UNSTRUCTURED_ERROR'
      })
    })()
    pending.add(task)
    void task.finally(() => pending.delete(task))
  })
  await fs.mkdir(output, { recursive: true })
  let navigation = 0
  /** 打开真实页面，route为已注册路径，使用独立顶层导航避免重复命令与旧组件复用 */
  const open = async (route) => {
    await expect.poll(() => inFlight.size, { timeout: 15000 }).toBe(0)
    await Promise.allSettled([...pending])
    await page.goto(`${h5.href.replace(/\/$/, '')}/?qa_page=${++navigation}#${route}`)
  }
  /** 等待实际BFF响应，method/path指定当前UI动作对应的公共契约 */
  const responseFor = (method, pattern) => {
    const response = page.waitForResponse(
      (response) =>
        response.request().method() === method && pattern.test(new URL(response.url()).pathname),
      { timeout: 15000 }
    )
    // UI动作可能先失败，提前观察拒绝仍将原Promise留给await，避免Node跳过报告直接终止
    void response.catch(() => undefined)
    return response
  }
  /** 记录页面断言，name为非个人步骤标签，action执行真实交互 */
  const step = async (name, action) => {
    currentStep = name
    await action()
    await expect.poll(() => inFlight.size, { timeout: 15000 }).toBe(0)
    await Promise.allSettled([...pending])
    // 私有新会话没有预期业务错误，任何API失败都阻断本步，不能只检查主动作
    expect(results.requests.every((request) => request.status >= 200 && request.status < 300)).toBe(
      true
    )
    expect(results.network_failures).toHaveLength(0)
    results.steps.push({ name, result: 'PASSED' })
  }
  /** 截图隐藏本人资料，name为稳定证据名，不将昵称/联系方式/头像落盘 */
  const screenshot = async (name) =>
    page.screenshot({
      path: path.join(output, `${name}.png`),
      fullPage: true,
      mask: [
        page.locator(
          '.identity-id,.identity-contact,.identity-name,.identity-avatar,.avatar-preview,input'
        )
      ]
    })
  captureFailure = () => screenshot('failure')
  await step('learning-stage', async () => {
    const catalog = responseFor('GET', /^\/api\/v1\/learning\/catalog$/)
    await open('/pages/learning/index')
    const response = await catalog
    expect(response.status()).toBe(200)
    const data = await response.json()
    expect(data.authorization_pending).toBe(false)
    expect(['NEW', 'ENTITLED']).toContain(data.user_stage)
    await expect(page.locator('.learning-modules')).toBeVisible()
    if (data.user_stage === 'ENTITLED')
      await expect(page.getByText('开放场景复习', { exact: true })).toBeVisible()
    else {
      await expect(page.locator('.review-link')).toHaveCount(0)
      await expect(page.getByText('开放场景', { exact: true })).toBeVisible()
    }
    await screenshot('learning-stage')
  })
  const favoriteIds = []
  let dualWord = ''
  const dualMeanings = []
  await step('scene-translation-and-favorites', async () => {
    const opened = responseFor('POST', /\/scenes\/[^/]+\/open$/)
    await open(`/sub-packages/scene/detail?sceneId=${encodeURIComponent(entities.scene_id)}`)
    const openedResponse = await opened
    expect(openedResponse.status()).toBe(200)
    const openedData = await openedResponse.json()
    expect(openedData.scene.content_id).toBe(entities.scene_id)
    if (entities.revision_id) expect(openedData.scene.revision_id).toBe(entities.revision_id)
    await expect(page.locator('.scene-reading-view')).toBeVisible()
    await expect(page.locator('.full-translation')).toHaveCount(0)
    await page.locator('.translation-toggle').click()
    await expect(page.locator('.full-translation')).toBeVisible()
    const cards = page.locator('.scene-word-card:not(.chunk)')
    expect(await cards.count()).toBeGreaterThan(0)
    for (let index = 0; index < Math.min(2, await cards.count()); index++) {
      const button = cards.nth(index).locator('.favorite-button')
      if ((await button.textContent()).includes('已收藏')) {
        const removed = responseFor('DELETE', /\/favorite-snapshots\/[^/]+$/)
        await button.click()
        expect((await removed).status()).toBe(200)
        await expect(button).toHaveText('收藏')
      }
      const saved = responseFor('POST', /^\/api\/v1\/favorite-snapshots$/)
      await button.click()
      const response = await saved
      expect(response.status()).toBe(201)
      const data = await response.json()
      expect(data.active).toBe(true)
      favoriteIds.push(data.favorite_id)
      await expect(button).toHaveText('已收藏')
      await expect(page.locator('.full-translation')).toBeVisible()
    }
    expect(new Set(favoriteIds).size).toBe(favoriteIds.length)
    const chunk = page.locator('.scene-word-card.chunk').first()
    if (await chunk.count()) {
      const button = chunk.locator('.favorite-button')
      if (!(await button.textContent()).includes('已收藏')) {
        const saved = responseFor('POST', /^\/api\/v1\/favorite-snapshots$/)
        await button.click()
        expect((await saved).status()).toBe(201)
      }
    }
    await screenshot('scene-favorites')
  })
  await step('pronunciation-contract', async () => {
    const button = page.locator('.pronunciation-button').first()
    await expect(button).toBeVisible()
    const resolved = responseFor('POST', /\/pronunciations\/[^/]+\/resolve$/)
    await button.click()
    const response = await resolved
    expect(response.status()).toBe(200)
    const data = await response.json()
    expect(['READY', 'PREPARING', 'FAILED', 'UNAVAILABLE']).toContain(data.status)
    // 状态只证明真实resolve；实际云音频与人工听音另列验收
    await screenshot('pronunciation-state')
  })
  await step('recording-disabled-read-and-complete', async () => {
    const opened = responseFor('POST', /\/scenes\/[^/]+\/open$/)
    await open(`/sub-packages/scene/shadowing?sceneId=${encodeURIComponent(entities.scene_id)}`)
    const response = await opened
    expect(response.status()).toBe(200)
    const data = await response.json()
    if (typeof data.scene.recording_enabled !== 'boolean')
      throw new Error('RECORDING_FLAG_CONTRACT_NOT_READY')
    if (data.scene.recording_enabled !== false)
      throw new Error('RECORDING_DISABLED_SCENARIO_REQUIRED')
    await expect(page.locator('.shadowing-sentences .dialogue-sentence')).toHaveCount(
      data.scene.dialogue.length
    )
    await expect(page.locator('.recording-action').filter({ hasText: '开始录音' })).toBeDisabled()
    await expect(page.locator('.recording-hint')).toContainText('录音暂未开放')
    const sentences = page.locator('.shadowing-sentences .dialogue-sentence')
    expect(data.scene.dialogue.length).toBeGreaterThan(1)
    const selected = data.scene.dialogue[1]
    if (!selected.slice_target_id) throw new Error('SCENE_SLICE_FIXTURE_REQUIRED')
    await sentences.nth(1).click()
    await expect(sentences.nth(1)).toHaveClass(/selected/)
    await expect(page.locator('.recording-top')).toContainText(
      `当前句 2 / ${data.scene.dialogue.length}`
    )
    const original = page.locator('.recording-top .audio-button.inline')
    await expect(original).toBeEnabled()
    const signed = responseFor('GET', /\/scenes\/[^/]+\/resources\/[^/]+\/signed-url$/)
    await original.click()
    const signedResponse = await signed
    expect(signedResponse.status()).toBe(200)
    expect((await signedResponse.json()).resource_id).toBe(selected.slice_target_id)
    // 真实取址证明原音入口与授权资源关联，人工听音和设备播放另列验收
    const completed = responseFor('POST', /\/scenes\/[^/]+\/complete$/)
    const result = responseFor('GET', /\/scenes\/[^/]+\/result$/)
    await page.locator('.scene-actions .scene-action.secondary').click()
    expect((await completed).status()).toBe(200)
    await page.waitForURL((url) => url.hash.includes('/scene/completed'))
    expect((await result).status()).toBe(200)
    await expect(page.locator('.scene-title')).toHaveText('学习完成')
    await expect(page.locator('.scene-highlight')).toContainText('本次学习已记录')
    await expect(page.locator('.result-card')).toHaveCount(3)
    await expect(page.locator('.result-details')).toBeVisible()
    await screenshot('recording-disabled-completed')
  })
  if (entities.word_card_id) {
    await step('word-card-distinct-senses', async () => {
      const opened = responseFor('POST', /\/scenes\/[^/]+\/open$/)
      await open(`/sub-packages/scene/detail?sceneId=${encodeURIComponent(entities.word_card_id)}`)
      const response = await opened
      expect(response.status()).toBe(200)
      const data = await response.json()
      expect(data.scene.content_type).toBe('word_card')
      expect(data.scene.content_id).toBe(entities.word_card_id)
      const cards = page.locator('.scene-word-card:not(.chunk)')
      await expect(cards).toHaveCount(2)
      expect(await cards.nth(0).locator('.word-english').textContent()).toBe(
        await cards.nth(1).locator('.word-english').textContent()
      )
      expect(await cards.nth(0).locator('.word-meaning').textContent()).not.toBe(
        await cards.nth(1).locator('.word-meaning').textContent()
      )
      dualWord = (await cards.nth(0).locator('.word-english').textContent()).trim()
      for (let index = 0; index < 2; index++)
        dualMeanings.push((await cards.nth(index).locator('.word-meaning').textContent()).trim())
      const distinctIds = []
      for (let index = 0; index < 2; index++) {
        const button = cards.nth(index).locator('.favorite-button')
        if ((await button.textContent()).includes('已收藏')) {
          const removed = responseFor('DELETE', /\/favorite-snapshots\/[^/]+$/)
          await button.click()
          expect((await removed).status()).toBe(200)
          await expect(button).toHaveText('收藏')
        }
        const saved = responseFor('POST', /^\/api\/v1\/favorite-snapshots$/)
        await button.click()
        const savedResponse = await saved
        expect(savedResponse.status()).toBe(201)
        const snapshot = await savedResponse.json()
        expect(snapshot.active).toBe(true)
        distinctIds.push(snapshot.favorite_id)
        await expect(button).toHaveText('已收藏')
      }
      expect(new Set(distinctIds).size).toBe(2)
      favoriteIds.push(...distinctIds)
      await screenshot('word-card-distinct-senses')
    })
  } else
    results.steps.push({ name: 'word-card-distinct-senses', result: 'NOT_RUN_ENTITY_REQUIRED' })
  await step('banks-and-detail-source', async () => {
    const list = responseFor('GET', /^\/api\/v1\/favorite-snapshots$/)
    await open('/pages/favorites/index')
    expect((await list).status()).toBe(200)
    await expect(page.locator('.favorite-entry').first()).toBeVisible()
    await page.locator('.bank-tab').filter({ hasText: '语块银行' }).click()
    await expect(page.locator('.bank-tab.selected')).toHaveText('语块银行')
    await page.locator('.bank-tab').filter({ hasText: '词汇银行' }).click()
    await expect(page.locator('.bank-tab.selected')).toHaveText('词汇银行')
    if (dualWord) {
      const entries = page.locator('.favorite-entry').filter({
        has: page.locator('.entry-word').filter({ hasText: dualWord })
      })
      expect(await entries.count()).toBeGreaterThanOrEqual(2)
      for (const meaning of dualMeanings)
        await expect(entries.filter({ hasText: meaning }).first()).toBeVisible()
    }
    await screenshot('favorite-banks')
    const detail = responseFor('GET', /\/favorite-snapshots\/[^/]+$/)
    await open(`/sub-packages/favorites/detail?id=${encodeURIComponent(favoriteIds[0])}`)
    expect((await detail).status()).toBe(200)
    await expect(page.locator('.favorite-summary')).toBeVisible()
    const source = responseFor('GET', /\/favorite-snapshots\/[^/]+\/source-resolution$/)
    // UNI-BUTTON接收点击，内部UNI-TEXT不接收指针事件；保持正常按钮点击及实际鉴权断言
    await page
      .locator('.page-actions .app-button')
      .filter({ hasText: /^返回原文$/ })
      .click()
    const response = await source
    expect(response.status()).toBe(200)
    const resolution = await response.json()
    expect(['EXACT', 'UPDATED_OR_UNRESOLVED', 'NO_ACCESS']).toContain(resolution.status)
    if (resolution.status === 'NO_ACCESS') {
      await expect(page.locator('.favorite-summary')).toBeVisible()
      expect(page.url()).toContain('/favorites/detail')
    } else {
      await page.waitForURL((url) => url.hash.includes('sceneId='))
      expect(page.url()).toContain(`contentVersion=${resolution.target_content_version}`)
      if (resolution.status === 'UPDATED_OR_UNRESOLVED')
        expect(page.url()).not.toContain('sourceLocator=')
      else expect(page.url()).toContain('sourceLocator=')
    }
  })
  await step('review-full-snapshot', async () => {
    const created = responseFor('POST', /^\/api\/v1\/reviews$/)
    await open(
      `/sub-packages/favorites/review-front?cardIds=${encodeURIComponent(favoriteIds.join(','))}`
    )
    expect((await created).status()).toBe(201)
    await expect(page.locator('.card-surface')).toBeVisible()
    await page.locator('.card-surface').click({ position: { x: 8, y: 8 } })
    await expect(page.getByText('来源句', { exact: true })).toBeVisible()
    for (let index = 0; index < favoriteIds.length - 1; index++) {
      await page
        .locator('.page-actions .app-button')
        .filter({ hasText: /^下一个$/ })
        .click()
      await expect(page.locator('.page-subtitle')).toContainText(
        `第 ${index + 2} 张 / ${favoriteIds.length}`
      )
      await expect(page.locator('.card-surface')).toBeVisible()
    }
    const completed = responseFor('POST', /\/reviews\/[^/]+\/complete$/)
    await page
      .locator('.page-actions .app-button')
      .filter({ hasText: /^完成复习$/ })
      .click()
    expect((await completed).status()).toBe(200)
    await expect(page.locator('.home-page-view')).toBeVisible()
    await screenshot('review-complete')
  })
  await step('profile-post-readback', async () => {
    /** 正常关闭本人联系引导，避免提示遮挡资料入口，不注入曝光收据 */
    const dismissContactPrompt = async () => {
      await expect.poll(() => inFlight.size, { timeout: 15000 }).toBe(0)
      const dialog = page.locator('.prompt-dialog')
      if (await dialog.count())
        await dialog
          .locator('.app-button')
          .filter({ hasText: /^稍后再说$/ })
          .click()
    }
    await open('/pages/profile/index')
    await expect(page.locator('.identity-head')).toBeVisible()
    await dismissContactPrompt()
    await page.locator('.identity-head').click()
    const input = page.locator('.profile-editor input')
    await expect(input).toBeEnabled()
    const original = await input.inputValue()
    await input.fill('联调学习者')
    const saved = responseFor('POST', /^\/api\/v1\/me\/profile$/)
    await page
      .locator('.profile-editor .app-button')
      .filter({ hasText: /^保存资料$/ })
      .click()
    expect((await saved).status()).toBe(200)
    await open('/pages/profile/index')
    await expect(page.locator('.identity-name')).toHaveText('联调学习者')
    await dismissContactPrompt()
    await page.locator('.identity-head').click()
    await expect(input).toHaveValue('联调学习者')
    await screenshot('profile-post')
    await input.fill(original)
    const restored = responseFor('POST', /^\/api\/v1\/me\/profile$/)
    await page
      .locator('.profile-editor .app-button')
      .filter({ hasText: /^保存资料$/ })
      .click()
    expect((await restored).status()).toBe(200)
  })
  if (entities.short_reading_id) {
    await step('short-reading-pure-read-complete', async () => {
      const opened = responseFor('POST', /\/short-readings\/[^/]+\/open$/)
      await open(
        `/sub-packages/short-reading/detail?contentId=${encodeURIComponent(entities.short_reading_id)}`
      )
      const response = await opened
      expect(response.status()).toBe(200)
      const data = await response.json()
      if (data.whole_audio === null)
        await expect(page.locator('.whole-audio,.tablet-audio')).toHaveCount(0)
      await expect(page.locator('.short-reading-paragraph').first()).toBeVisible()
      await expect(page.locator('.scene-word-card,.pronunciation-button')).toHaveCount(0)
      const tag = page.locator('.reading-tag').first()
      await tag.click()
      await expect(tag).toHaveAttribute('aria-pressed', 'true')
      await page.locator('.translation-toggle').click()
      await expect(page.locator('.full-translation')).toBeVisible()
      await expect(tag).toHaveAttribute('aria-pressed', 'true')
      const complete = page.locator('.complete-button')
      if ((await complete.textContent()).includes('已读完'))
        throw new Error('SHORT_READING_ALREADY_COMPLETED_REQUIRES_FRESH_FIXTURE')
      {
        const completed = responseFor('POST', /\/short-readings\/[^/]+\/complete$/)
        await complete.click()
        expect((await completed).status()).toBe(200)
        await expect(complete).toHaveText('已读完')
      }
      await screenshot('short-reading-complete')
      await page.reload()
      await expect(page.locator('.complete-button')).toHaveText('已读完')
      await expect(page.locator('.full-translation')).toHaveCount(0)
    })
    await step('short-reading-independent-history', async () => {
      const history = responseFor('GET', /^\/api\/v1\/short-readings\/history$/)
      await open('/sub-packages/short-reading/index')
      const response = await history
      expect(response.status()).toBe(200)
      const data = await response.json()
      const index = data.items.findIndex((item) => item.content_id === entities.short_reading_id)
      expect(index).toBeGreaterThanOrEqual(0)
      expect(data.items[index].completed_at).toBeTruthy()
      expect(data.completed_count).toBeGreaterThanOrEqual(1)
      expect(data.started_count).toBeGreaterThanOrEqual(data.completed_count)
      await expect(page.locator('.history-counts')).toContainText(
        `已读完 ${data.completed_count} 篇`
      )
      const row = page.locator('.reading-history-card').nth(index)
      await expect(row).toContainText(data.items[index].title_en)
      await expect(row).toContainText('已读完')
      await row.scrollIntoViewIfNeeded()
      await screenshot('short-reading-history')
    })
  } else
    results.steps.push({
      name: 'short-reading-pure-read-complete',
      result: 'NOT_RUN_ENTITY_REQUIRED'
    })
  if (entities.word_card_id && entities.short_reading_id) {
    await step('responsive-real-content', async () => {
      /** 检查当前正文及页面水平边界，selector为用户实际看到的内容容器，width为本轮视口 */
      const assertWidth = async (selector, width) => {
        const scrollWidth = await page.evaluate(
          () => globalThis.document.documentElement.scrollWidth
        )
        expect(scrollWidth).toBeLessThanOrEqual(width)
        const box = await page.locator(selector).boundingBox()
        expect(box).not.toBeNull()
        expect(box.x).toBeGreaterThanOrEqual(-1)
        expect(box.x + box.width).toBeLessThanOrEqual(width + 1)
      }
      for (const width of [375, 390, 414, 768, 1024]) {
        await page.setViewportSize({ width, height: 844 })
        for (const [name, id] of [
          ['scene', entities.scene_id],
          ['word-card', entities.word_card_id]
        ]) {
          const opened = responseFor('POST', /\/scenes\/[^/]+\/open$/)
          await open(`/sub-packages/scene/detail?sceneId=${encodeURIComponent(id)}`)
          const response = await opened
          expect(response.status()).toBe(200)
          expect((await response.json()).scene.content_id).toBe(id)
          await expect(page.locator('.scene-reading-view')).toBeVisible()
          if (await page.locator('.translation-toggle').count()) {
            await page.locator('.translation-toggle').click()
            await expect(page.locator('.full-translation')).toBeVisible()
          }
          const last = page.locator('.scene-word-card').last()
          await last.scrollIntoViewIfNeeded()
          await expect(last).toBeVisible()
          await assertWidth('.scene-reading-view', width)
          const end = await last.boundingBox()
          const action = await page.locator('.fixed-action').boundingBox()
          expect(end.y + end.height).toBeLessThanOrEqual(action.y + 1)
          await screenshot(`${name}-${width}-end`)
          results.viewports.push({
            width,
            page: name,
            end_visible: true,
            horizontal_overflow: false
          })
        }
        const opened = responseFor('POST', /\/short-readings\/[^/]+\/open$/)
        await open(
          `/sub-packages/short-reading/detail?contentId=${encodeURIComponent(entities.short_reading_id)}`
        )
        expect((await opened).status()).toBe(200)
        await expect(page.locator('.short-reading-paragraph').first()).toBeVisible()
        await page.locator('.translation-toggle').click()
        await expect(page.locator('.full-translation')).toBeVisible()
        await page.locator('.complete-button').scrollIntoViewIfNeeded()
        await assertWidth('.reading-card', width)
        const completed = await page.locator('.complete-button').boundingBox()
        const navigation = await page
          .locator(width < 700 ? '.mobile-navigation .tab-bar' : '.tablet-navigation')
          .boundingBox()
        expect(completed.y + completed.height).toBeLessThanOrEqual(navigation.y + 1)
        await screenshot(`short-reading-${width}-end`)
        results.viewports.push({
          width,
          page: 'short-reading',
          end_visible: true,
          horizontal_overflow: false
        })
        const history = responseFor('GET', /^\/api\/v1\/short-readings\/history$/)
        await open('/sub-packages/short-reading/index')
        expect((await history).status()).toBe(200)
        await expect(page.locator('.reading-history-card').first()).toBeVisible()
        await page.locator('.reading-history').scrollIntoViewIfNeeded()
        await assertWidth('.reading-history', width)
        await screenshot(`reading-history-${width}`)
        results.viewports.push({
          width,
          page: 'reading-history',
          end_visible: true,
          horizontal_overflow: false
        })
      }
    })
  }
  await Promise.allSettled([...pending])
  expect(results.requests.length).toBeGreaterThan(0)
  expect(results.requests.every((request) => request.expected_origin)).toBe(true)
  expect(results.requests.every((request) => request.status >= 200 && request.status < 300)).toBe(
    true
  )
  expect(results.network_failures).toHaveLength(0)
  expect(results.page_errors).toBe(0)
} catch (error) {
  await captureFailure?.().catch(() => undefined)
  results.steps.push({
    name: currentStep,
    result: 'FAILED',
    error_type: error.name,
    script_line: Number(error.stack?.match(/run-v15-h5-e2e\.mjs:(\d+):\d+/)?.[1]) || undefined,
    error_code: /^[A-Z0-9_]+$/.test(error.message) ? error.message : 'PAGE_OR_HTTP_ASSERTION_FAILED'
  })
  process.exitCode = 1
} finally {
  await browser?.close()
  await Promise.allSettled([...pending])
  const failedEvidence =
    results.requests.some(
      (request) => !request.expected_origin || request.status < 200 || request.status >= 300
    ) ||
    results.network_failures.length > 0 ||
    results.page_errors > 0
  if (failedEvidence) {
    results.steps.push({
      name: 'final-http-evidence',
      result: 'FAILED',
      error_code: 'HTTP_OR_NETWORK_FAILURE'
    })
    process.exitCode = 1
  }
  await fs.mkdir(output, { recursive: true })
  if (results.steps.some((step) => step.result !== 'PASSED')) process.exitCode = 1
  await fs.writeFile(
    path.join(output, 'browser-results.json'),
    JSON.stringify(results, null, 2) + '\n'
  )
  log(
    JSON.stringify({
      report: path.join(output, 'browser-results.json'),
      steps: results.steps,
      request_count: results.requests.length,
      network_failure_count: results.network_failures.length
    })
  )
}
