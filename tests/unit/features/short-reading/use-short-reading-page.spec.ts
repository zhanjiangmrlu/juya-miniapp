// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'

import { presentSourceResolution } from '@/features/favorites/source-resolution'
import { shortReadingEntryFromQuery } from '@/features/short-reading/short-reading-entry'
import { useShortReadingList } from '@/features/short-reading/use-short-reading-list'
import { useShortReadingPage } from '@/features/short-reading/use-short-reading-page'
import { decodePageQuery } from '@/shared/navigation/decode-page-query'

import type { AudioSnapshot } from '@/shared/types/audio'

const runtime = vi.hoisted(() => ({
  catalog: { getModules: vi.fn() },
  shortReading: {
    list: vi.fn(),
    open: vi.fn(),
    preview: vi.fn(),
    savePosition: vi.fn(),
    complete: vi.fn(),
    getSignedUrl: vi.fn()
  }
}))
const audio = vi.hoisted(() => ({
  dispose: vi.fn(),
  play: vi.fn(),
  snapshot: { target: null, status: 'IDLE' } as AudioSnapshot
}))
const hooks = vi.hoisted(() => ({
  show: undefined as (() => void) | undefined,
  hide: undefined as (() => void) | undefined
}))
let session = reactive({
  cleanupGeneration: 0,
  isAuthenticated: true,
  profile: { juya_id: 'JU-test-account' }
})
vi.mock('@/services/runtime', () => ({ getRuntimeServices: () => runtime }))
vi.mock('@/stores/audio', () => ({ useAudioStore: () => audio }))
vi.mock('@/stores/session', () => ({ useSessionStore: () => session }))
vi.mock('@dcloudio/uni-app', () => ({
  onShow: (callback: () => void) => {
    hooks.show = callback
  },
  onHide: (callback: () => void) => {
    hooks.hide = callback
  },
  onUnload: vi.fn()
}))

/** 在组件生命周期内创建页面，previewOnly 表示只请求安全预览 */
const setup = (previewOnly = false) => {
  let page!: ReturnType<typeof useShortReadingPage>
  const wrapper = mount({
    setup: () => {
      page = useShortReadingPage(previewOnly)
      return () => null
    }
  })
  return { wrapper, page }
}

beforeEach(() => {
  vi.resetAllMocks()
  audio.snapshot = { target: null, status: 'IDLE' }
  session = reactive({
    cleanupGeneration: 0,
    isAuthenticated: true,
    profile: { juya_id: 'JU-test-account' }
  })
  runtime.catalog.getModules.mockResolvedValue({ items: [{ key: 'short_reading', enabled: true }] })
  runtime.shortReading.preview.mockResolvedValue({
    content_id: 'reading',
    title_zh: 'safe',
    intro: 'safe',
    access: 'PREVIEW'
  })
  runtime.shortReading.open.mockResolvedValue({
    content_id: 'reading',
    content_type: 'short_reading',
    content_version: 2,
    paragraphs_en: [{ paragraph_id: 'p1', text: 'paragraph' }],
    progress: { client_sequence: 1, content_version: 2, position: null },
    whole_audio: null
  })
})
afterEach(() => vi.useRealTimers())

describe('短文直接路由与账号边界', () => {
  it('播放按钮不能沿用其他内容或其他资源版本的同ID播放状态', async () => {
    const target = {
      target_id: 'shared',
      target_type: 'short_reading_whole',
      version_id: 'a1',
      revision_id: 'r2',
      resource_id: 'shared',
      content_id: 'reading',
      content_type: 'short_reading',
      content_version: 2,
      context: { content_type: 'short_reading', content_id: 'reading', content_version: 2 }
    }
    const detail = await runtime.shortReading.open()
    runtime.shortReading.open.mockResolvedValueOnce({ ...detail, whole_audio: target })
    audio.snapshot = {
      target: {
        ...target,
        context: { content_type: 'short_reading', content_id: 'other', content_version: 2 }
      },
      status: 'PLAYING'
    }
    const { wrapper, page } = setup()
    await page.initialize('reading')
    expect(page.audioStatus.value).toBe('IDLE')
    wrapper.unmount()
  })

  it('分页网络失败保留已加载顺序与游标，重试原页追加而非从头重置', async () => {
    runtime.shortReading.list
      .mockResolvedValueOnce({
        items: [{ content_id: 'first' }],
        has_more: true,
        next_cursor: 'server-cursor'
      })
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({
        items: [{ content_id: 'second' }],
        has_more: false,
        next_cursor: null
      })
    let list!: ReturnType<typeof useShortReadingList>
    const wrapper = mount({
      setup: () => {
        list = useShortReadingList()
        return () => null
      }
    })
    await list.load()
    await list.load(true)
    expect(list.items.value.map((item) => item.content_id)).toEqual(['first'])
    expect(list.nextCursor.value).toBe('server-cursor')
    await list.load(true)
    expect(list.items.value.map((item) => item.content_id)).toEqual(['first', 'second'])
    expect(runtime.shortReading.list.mock.calls[2]).toEqual(['server-cursor'])
    wrapper.unmount()
  })
  it('收藏来源实际短文路由读取contentId及版本，UPDATED忽略旧阅读位置', async () => {
    const { wrapper, page } = setup()
    runtime.shortReading.open.mockResolvedValue({
      content_id: 'reading',
      content_version: 2,
      paragraphs_en: [
        { paragraph_id: 'p1', text: 'first' },
        { paragraph_id: 'p2', text: 'last' }
      ],
      progress: {
        content_version: 2,
        client_sequence: 1,
        position: { paragraph_id: 'p2', offset: 10 }
      }
    })
    const exact = presentSourceResolution({
      status: 'EXACT',
      saved_content_version: 2,
      safe_summary: {},
      content_id: 'reading',
      content_type: 'short_reading',
      target_content_version: 2,
      locator: { paragraph_id: 'p1' }
    })
    expect(exact.route).toContain('/sub-packages/short-reading/detail?contentId=reading')
    const query = Object.fromEntries(new URLSearchParams(exact.route!.split('?')[1]))
    await page.initialize(decodePageQuery(query.contentId), shortReadingEntryFromQuery(query))
    expect(page.sourceParagraphId.value).toBe('p1')
    expect(page.initialPosition.value).toEqual({ paragraph_id: 'p1', offset: 0 })
    const updated = presentSourceResolution({
      status: 'UPDATED_OR_UNRESOLVED',
      saved_content_version: 1,
      safe_summary: {},
      content_id: 'reading',
      content_type: 'short_reading',
      target_content_version: 2,
      locator: { paragraph_id: 'p2' }
    })
    const updatedQuery = Object.fromEntries(new URLSearchParams(updated.route!.split('?')[1]))
    await page.initialize(
      decodePageQuery(updatedQuery.contentId),
      shortReadingEntryFromQuery(updatedQuery)
    )
    expect(page.initialPosition.value).toBeUndefined()
    expect(page.position.value).toEqual({ paragraph_id: 'p1', offset: 0 })
    expect(page.errorMessage.value).toBe('来源内容已更新')
    wrapper.unmount()
  })

  it('清空学习数据后迟到列表不能复原账号摘要', async () => {
    let resolve!: (value: unknown) => void
    runtime.shortReading.list.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done
        })
    )
    let list!: ReturnType<typeof useShortReadingList>
    const wrapper = mount({
      setup: () => {
        list = useShortReadingList()
        return () => null
      }
    })
    const pending = list.load()
    await vi.waitFor(() => expect(runtime.shortReading.list).toHaveBeenCalledTimes(1))
    session.cleanupGeneration++
    resolve({ items: [{ content_id: 'reading' }], has_more: false, next_cursor: null })
    await pending
    expect(list.items.value).toEqual([])
    expect(list.unavailable.value).toBe(true)
    wrapper.unmount()
  })
  it('清空学习数据保留身份仍删除局部状态并丢弃待提交位置', async () => {
    vi.useFakeTimers()
    const { wrapper, page } = setup()
    await page.initialize('reading')
    page.toggleTag('category')
    page.toggleTranslation()
    page.savePosition({ paragraph_id: 'p1', offset: 99 })
    session.cleanupGeneration++
    expect(session.isAuthenticated).toBe(true)
    expect(page.detail.value).toBeUndefined()
    expect(page.translationVisible.value).toBe(false)
    expect(page.categorySelected.value).toBe(false)
    expect(page.position.value).toEqual({ paragraph_id: '', offset: 0 })
    await vi.advanceTimersByTimeAsync(1000)
    expect(runtime.shortReading.savePosition).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('清空学习数据后迟到的open不能复原正文', async () => {
    const response = await runtime.shortReading.open()
    let resolve!: (value: typeof response) => void
    runtime.shortReading.open.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done
        })
    )
    const { wrapper, page } = setup()
    const pending = page.initialize('reading')
    await vi.waitFor(() => expect(runtime.shortReading.open).toHaveBeenCalledTimes(2))
    session.cleanupGeneration++
    resolve(response)
    await pending
    expect(page.detail.value).toBeUndefined()
    expect(page.status.value).toBe('UNAVAILABLE')
    wrapper.unmount()
  })
  it('模块关闭时直接详情也不请求正文、预览或进度', async () => {
    runtime.catalog.getModules.mockResolvedValueOnce({
      items: [{ key: 'short_reading', enabled: false }]
    })
    const { wrapper, page } = setup()
    await page.initialize('reading')
    expect(page.status.value).toBe('UNAVAILABLE')
    expect(runtime.shortReading.open).not.toHaveBeenCalled()
    expect(runtime.shortReading.preview).not.toHaveBeenCalled()
    expect(runtime.shortReading.savePosition).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('安全预览入口只读白名单，无打开或进度副作用', async () => {
    const { wrapper, page } = setup(true)
    await page.initialize('reading')
    expect(page.summary.value?.intro).toBe('safe')
    expect(runtime.shortReading.open).not.toHaveBeenCalled()
    expect(runtime.shortReading.preview).toHaveBeenCalledWith('reading')
    wrapper.unmount()
  })

  it('退出账号立刻删除正文和待提交写入，不转移到另一用户', async () => {
    vi.useFakeTimers()
    const { wrapper, page } = setup()
    await page.initialize('reading')
    page.savePosition({ paragraph_id: 'p1', offset: 99 })
    session.isAuthenticated = false
    expect(page.detail.value).toBeUndefined()
    await vi.advanceTimersByTimeAsync(1000)
    expect(runtime.shortReading.savePosition).not.toHaveBeenCalled()
    expect(page.status.value).toBe('UNAVAILABLE')
    wrapper.unmount()
  })

  it('返回页面先重验模块，关闭后的旧正文与播放器不恢复', async () => {
    const { wrapper, page } = setup()
    await page.initialize('reading')
    hooks.hide?.()
    runtime.catalog.getModules.mockResolvedValueOnce({ items: [] })
    hooks.show?.()
    await vi.waitFor(() => expect(page.status.value).toBe('UNAVAILABLE'))
    expect(runtime.shortReading.open).toHaveBeenCalledTimes(1)
    expect(page.detail.value).toBeUndefined()
    wrapper.unmount()
  })
})
