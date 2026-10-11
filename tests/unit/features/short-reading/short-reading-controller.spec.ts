import { afterEach, describe, expect, it, vi } from 'vitest'

import { createShortReadingController } from '@/features/short-reading/short-reading-controller'

import type { ShortReadingDetail } from '@/shared/contracts/short-reading'
import type { ShortReadingService } from '@/shared/types/short-reading'

/** 创建合法纯阅读资料，id 为稳定短文标识 */
const detail = (id = 'reading'): ShortReadingDetail => ({
  content_type: 'short_reading',
  content_id: id,
  content_version: 2,
  revision_id: 'r2',
  title_en: 'A Small Favor',
  title_zh: '一个小忙',
  category: '生活短文',
  topic: '邻里',
  level: 'A2',
  intro: '一次帮助',
  access: 'OPEN',
  paragraphs_en: [
    { paragraph_id: 'p1', text: 'First paragraph.' },
    { paragraph_id: 'p2', text: 'Last paragraph.' }
  ],
  translation_zh: '完整译文',
  whole_audio: null,
  progress: {
    content_id: id,
    content_type: 'short_reading',
    content_version: 2,
    client_sequence: 7,
    position: { paragraph_id: 'p2', offset: 15 },
    started_at: null,
    last_read_at: null,
    completed_at: null
  }
})

/** 提供受控服务和全局播放器端口 */
const setup = () => {
  const service = {
    open: vi.fn().mockResolvedValue(detail()),
    preview: vi.fn().mockResolvedValue({ ...detail(), intro: 'safe' }),
    savePosition: vi.fn().mockResolvedValue({}),
    complete: vi
      .fn()
      .mockResolvedValue({ progress: { ...detail().progress, completed_at: '2026-10-11' } }),
    getSignedUrl: vi.fn(),
    list: vi.fn()
  } satisfies ShortReadingService
  const audio = { play: vi.fn(), dispose: vi.fn() }
  return { service, audio, page: createShortReadingController({ service, audio }) }
}

afterEach(() => vi.useRealTimers())

describe('短文纯阅读状态', () => {
  it('同版本收藏来源以精确段落覆盖阅读位置，其他来源入口从顶部进入', async () => {
    const { page } = setup()
    await page.initialize('reading', false, { contentVersion: 2, sourceLocator: 'p1' })
    expect(page.position.value).toEqual({ paragraph_id: 'p1', offset: 0 })
    expect(page.initialPosition.value).toEqual({ paragraph_id: 'p1', offset: 0 })
    expect(page.sourceParagraphId.value).toBe('p1')
    await page.initialize('reading', false, { contentVersion: 2 })
    expect(page.position.value).toEqual({ paragraph_id: 'p1', offset: 0 })
    expect(page.initialPosition.value).toBeUndefined()
    expect(page.sourceParagraphId.value).toBeUndefined()
    await page.initialize('reading', false, { contentVersion: 1, sourceLocator: 'p2' })
    expect(page.initialPosition.value).toBeUndefined()
    expect(page.position.value).toEqual({ paragraph_id: 'p1', offset: 0 })
    expect(page.errorMessage.value).toBe('来源内容已更新')
    page.dispose()
  })

  it('相同段落ID不唯一时不得猜测收藏定位', async () => {
    const { page, service } = setup()
    service.open.mockResolvedValueOnce({
      ...detail(),
      paragraphs_en: [
        { paragraph_id: 'p2', text: 'one' },
        { paragraph_id: 'p2', text: 'two' }
      ]
    })
    await page.initialize('reading', false, { contentVersion: 2, sourceLocator: 'p2' })
    expect(page.initialPosition.value).toBeUndefined()
    expect(page.sourceParagraphId.value).toBeUndefined()
    page.dispose()
  })
  it('正常离页前尽力保存最新段落，字符偏移不混入本地滚动像素', async () => {
    const { page, service } = setup()
    await page.initialize('reading')
    page.savePosition({ paragraph_id: 'p2', offset: 99 })
    page.suspend(true)
    expect(service.savePosition).toHaveBeenCalledWith(
      'reading',
      expect.objectContaining({ content_version: 2, paragraph_id: 'p2', offset: 0 }),
      expect.any(String)
    )
    expect(page.detail.value).toBeUndefined()
    page.dispose()
  })
  it('默认收起全文译文和独立标签，切译文保持锚点，重新进入重置', async () => {
    const { page, service } = setup()
    await page.initialize('reading')
    expect(page.translationVisible.value).toBe(false)
    page.toggleTag('category')
    page.toggleTag('level')
    page.toggleTranslation()
    expect(page.categorySelected.value).toBe(true)
    expect(page.levelSelected.value).toBe(true)
    expect(page.position.value).toEqual({ paragraph_id: 'p2', offset: 15 })
    expect(service.savePosition).not.toHaveBeenCalled()
    page.toggleTag('category')
    expect(page.levelSelected.value).toBe(true)
    await page.initialize('reading')
    expect(page.categorySelected.value).toBe(false)
    expect(page.levelSelected.value).toBe(false)
    expect(page.translationVisible.value).toBe(false)
    page.dispose()
  })

  it('没有音频或未展开译文仍能主动标记读完', async () => {
    const { page, service, audio } = setup()
    await page.initialize('reading')
    expect(await page.complete()).toBe(true)
    expect(page.detail.value?.progress.completed_at).toBe('2026-10-11')
    expect(service.complete).toHaveBeenCalledWith('reading', 2, expect.any(String))
    expect(audio.play).not.toHaveBeenCalled()
    page.dispose()
  })

  it('安全预览丢弃受限字段，失权清空正文、译文、播放和待提交位置', async () => {
    vi.useFakeTimers()
    const { page, service, audio } = setup()
    await page.initialize('reading')
    page.savePosition({ paragraph_id: 'p1', offset: 0 })
    service.complete.mockRejectedValueOnce({ status: 403 })
    expect(await page.complete()).toBe(false)
    await vi.waitFor(() => expect(page.summary.value?.intro).toBe('safe'))
    expect(page.detail.value).toBeUndefined()
    expect(page.summary.value).not.toHaveProperty('paragraphs_en')
    expect(page.summary.value).not.toHaveProperty('translation_zh')
    expect(page.summary.value).not.toHaveProperty('whole_audio')
    expect(page.summary.value).not.toHaveProperty('progress')
    await vi.advanceTimersByTimeAsync(1000)
    expect(service.savePosition).not.toHaveBeenCalled()
    expect(audio.dispose).toHaveBeenCalled()
    page.dispose()
  })

  it('版本不匹配的保存锚点回到顶部，不猜测旧段落', async () => {
    const { page, service } = setup()
    service.open.mockResolvedValueOnce({
      ...detail(),
      progress: { ...detail().progress, content_version: 1 }
    })
    await page.initialize('reading')
    expect(page.position.value).toEqual({ paragraph_id: 'p1', offset: 0 })
    page.dispose()
  })

  it('上一页迟到正文和完成结果不进入新页面', async () => {
    const { page, service } = setup()
    let resolve!: (value: ShortReadingDetail) => void
    service.open
      .mockImplementationOnce(
        () =>
          new Promise((done) => {
            resolve = done
          })
      )
      .mockResolvedValueOnce(detail('second'))
    const first = page.initialize('reading')
    await page.initialize('second')
    resolve(detail())
    await first
    expect(page.detail.value?.content_id).toBe('second')
    page.dispose()
  })
})
