import { spawnSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'

import { afterAll, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import type { createAnalyticsService } from '@/services/analytics-service'

const root = fileURLToPath(new URL('../../', import.meta.url))
const output = mkdtempSync(path.join(tmpdir(), 'juya-font-build-'))
const require = createRequire(import.meta.url)
const cli = path.join(
  path.dirname(require.resolve('@dcloudio/vite-plugin-uni/package.json')),
  'bin/uni.js'
)

afterAll(() => rmSync(output, { recursive: true, force: true }))

/** 执行启用统计的实际微信产物，原生请求仅在内存捕获
 * @param directory 当前测试模式构建产物
 */
const verifyCompiledAnalytics = async (directory: string) => {
  vi.useFakeTimers()
  const saved = new Map<string, unknown>(),
    modules = new Map<string, { exports: Record<string, unknown> }>(),
    sent: Record<string, unknown>[] = []
  const native = {
    getStorageSync: (key: string) => saved.get(key) ?? '',
    setStorageSync: (key: string, value: unknown) => saved.set(key, value),
    removeStorageSync: (key: string) => saved.delete(key),
    getSystemInfo: ({ success }: { success: (value: unknown) => void }) =>
      success({
        model: 'fixture-phone',
        brand: 'fixture-brand',
        system: 'iOS 18',
        platform: 'ios',
        SDKVersion: '3.0.0',
        version: '8.0.0',
        language: 'zh_CN',
        pixelRatio: 3,
        screenWidth: 390,
        screenHeight: 844
      }),
    getNetworkType: ({ success }: { success: (value: unknown) => void }) =>
      success({ networkType: 'wifi' }),
    getAccountInfoSync: () => ({
      miniProgram: { appId: 'fixture-app', envVersion: 'trial', version: 'fixture' }
    }),
    request: (input: {
      data?: Record<string, unknown>
      success: (value: unknown) => void
      complete: (value: unknown) => void
    }) => {
      sent.push(input.data || {})
      input.success({ statusCode: 200, data: {} })
      input.complete({ statusCode: 200 })
      return { abort: () => undefined }
    }
  }
  /** 按微信CommonJS缓存和加载真实模块，只替换公共Vue端口与原生微信能力
   * @param filename 当前已编译模块的绝对路径
   */
  const load = (filename: string): Record<string, unknown> => {
    const cached = modules.get(filename)
    if (cached) return cached.exports
    const module = { exports: {} as Record<string, unknown> }
    modules.set(filename, module)
    if (filename === path.join(directory, 'common/vendor.js'))
      module.exports = { ref, index: native, wx$1: native }
    else
      runInNewContext(
        readFileSync(filename, 'utf8'),
        {
          exports: module.exports,
          require: (id: string) => load(path.resolve(path.dirname(filename), id)),
          wx: native,
          setTimeout,
          clearTimeout,
          setInterval,
          clearInterval,
          Date,
          console
        },
        { filename }
      )
    return module.exports
  }
  try {
    load(path.join(directory, 'services/analytics-bootstrap.js'))
    const service = load(path.join(directory, 'services/analytics.js')).analytics as ReturnType<
      typeof createAnalyticsService
    >
    const context = {
      owner: 'fixture-owner',
      revision: 1,
      enabled: false,
      policiesReady: true,
      scopeVersion: 'umeng-20261115-v3'
    }
    const authorized: string[] = []
    service.configure({
      context: () => context,
      currentPage: () => 'pages/home/index?token=fixture-secret',
      authorize: async (event) => {
        authorized.push(event.event)
      }
    })
    service.foreground()
    expect(sent).toEqual([])
    context.enabled = true
    service.sync()
    expect(service.running).toBe(true)
    await service.track('content_open', { content_type: 'scene', content_id: 'fixture-content' })
    service.background()
    expect(authorized).toEqual(['content_open'])
    expect(JSON.stringify(sent)).toContain('fixture-content')
    expect(JSON.stringify(sent)).toContain('pages/home/index')
    expect(JSON.stringify(sent)).not.toContain('fixture-secret')
    context.enabled = false
    service.sync()
    const count = sent.length
    vi.advanceTimersByTime(60000)
    service.foreground()
    await service.track('content_open', { content_id: 'withdrawn-content' })
    expect(sent).toHaveLength(count)
    expect(service.running).toBe(false)
    expect(saved.size).toBe(0)
  } finally {
    vi.clearAllTimers()
    vi.useRealTimers()
  }
}

it.each([
  ['test', true],
  ['production', true],
  ['production', false]
] as const)(
  'keeps fonts remote and isolates analytics in %s builds with enabled=%s',
  async (mode, enabled) => {
    const directory = path.join(output, `${mode}-${enabled}`)
    // Vitest 自身处于 test 模式，不把它的 VITE 配置覆盖到待验证的生产构建
    const buildEnv = Object.fromEntries(
      Object.entries(process.env).filter(([key]) => !key.startsWith('VITE_'))
    )
    const result = spawnSync(process.execPath, [cli, 'build', '-p', 'mp-weixin', '--mode', mode], {
      cwd: root,
      env: {
        ...buildEnv,
        VITE_UMENG_ENABLED: String(enabled),
        VITE_UMENG_TEST_APP_KEY: 'fixture-umeng-test',
        VITE_UMENG_PROD_APP_KEY: 'fixture-umeng-prod',
        UNI_OUTPUT_DIR: directory
      },
      encoding: 'utf8'
    })
    expect(result.status, result.stdout + result.stderr).toBe(0)
    const css = readFileSync(path.join(directory, 'app.wxss'), 'utf8')
    const embedded = [...css.matchAll(/data:font\/woff;base64,([^'"\s)]+)/g)]
    expect(embedded).toHaveLength(0)
    const files = readdirSync(directory, { recursive: true }).map(String)
    expect(files.some((file) => file.endsWith('.woff'))).toBe(false)
    expect(files.some((file) => file.includes('home-watercolor'))).toBe(false)
    const javascript = files
      .filter((file) => file.endsWith('.js'))
      .map((file) => readFileSync(path.join(directory, file), 'utf8'))
      .join('\n')
    const sdkEnabled = enabled
    expect(javascript.includes('um_uuid')).toBe(sdkEnabled)
    expect(javascript.includes('fixture-umeng-test')).toBe(mode === 'test' && enabled)
    expect(javascript.includes('fixture-umeng-prod')).toBe(mode === 'production' && enabled)
    expect(javascript.includes('content_view')).toBe(false)
    expect(javascript.includes('contact_save')).toBe(false)
    expect(javascript.includes('umini.shujupie.com')).toBe(sdkEnabled)
    expect(javascript.includes('wxm_logs')).toBe(sdkEnabled)
    if (!sdkEnabled)
      for (const event of [
        'entry_click',
        'business_error',
        'dictionary_success',
        'study_note_ready'
      ])
        expect(javascript.includes(event)).toBe(false)
    const audioController = readFileSync(
      path.join(directory, 'services/audio-controller.js'),
      'utf8'
    )
    expect(audioController.includes('audio_kind')).toBe(sdkEnabled)
    const policy = readFileSync(
      path.join(directory, 'components/app-privacy-sheet/app-privacy-sheet.wxml'),
      'utf8'
    )
    expect(policy.includes('使用统计')).toBe(true)
    expect(policy.includes('<switch')).toBe(false)
    if (sdkEnabled) await verifyCompiledAnalytics(directory)
    if (!sdkEnabled) {
      const compiled: {
        analytics?: { available: boolean; choice: () => unknown; hasConsent: () => boolean }
      } = {}
      runInNewContext(readFileSync(path.join(directory, 'services/analytics.js'), 'utf8'), {
        exports: compiled
      })
      expect(compiled.analytics?.available).toBe(false)
      expect(compiled.analytics?.choice()).toBe(false)
      expect(compiled.analytics?.hasConsent()).toBe(false)
    }
    const { measureMainPackage } = require(path.join(root, 'scripts/verify-mp-package-budget.mjs'))
    expect(measureMainPackage(directory).sourceBytes).toBeLessThan((sdkEnabled ? 560 : 480) * 1024)
  },
  60000
)
