import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useScenePage } from '@/features/scene/use-scene-page'

const runtime = vi.hoisted(() => ({
  scene: {
    open: vi.fn(),
    getEntry: vi.fn(),
    getResource: vi.fn(),
    getSignedUrl: vi.fn(),
    savePosition: vi.fn(),
    complete: vi.fn()
  },
  client: { post: vi.fn() }
}))
vi.mock('@/services/runtime', () => ({ getRuntimeServices: () => runtime }))
const hooks = vi.hoisted(() => ({ show: undefined as (() => void) | undefined }))
const analytics = vi.hoisted(() => ({ capture: vi.fn(() => 1), track: vi.fn() }))
vi.mock('@/services/analytics/runtime', () => ({ getAnalytics: () => analytics }))
vi.mock('@dcloudio/uni-app', () => ({
  onShow: (listener: () => void) => {
    hooks.show = listener
  }
}))

const word = {
  entry_id: 'latte',
  entry_type: 'VOCABULARY',
  entry_version: 2,
  source_locator: 'sentence:s1:entry:latte',
  text: 'old text'
}
const full = {
  access: 'OPEN',
  authorization_pending: false,
  scene: {
    scene_id: 'coffee',
    revision_id: 'revision',
    original_image_asset_id: 'image',
    entries: [word],
    chinese_title: '咖啡店',
    title: 'Coffee',
    series: '日常英语'
  }
}

describe('场景授权资源与词卡', () => {
  it('场景实际打开成功上报一次，返回页面后台核验不重复计算', async () => {
    const page = useScenePage()
    await page.initialize('coffee')
    page.disposeAudio()
    hooks.show?.()
    await vi.waitFor(() => expect(runtime.scene.open).toHaveBeenCalledTimes(2))
    expect(
      analytics.track.mock.calls.filter(([event]) => event === 'scene_open_success')
    ).toHaveLength(1)
  })
  it('完成失败不记成功，重复成功回调使用同一完成去重键', async () => {
    const page = useScenePage()
    await page.initialize('coffee')
    runtime.scene.complete.mockRejectedValueOnce(new Error('offline'))
    expect(await page.complete()).toBe(false)
    expect(
      analytics.track.mock.calls.filter(([event]) => event === 'learn_complete_success')
    ).toHaveLength(0)
    expect(await page.complete()).toBe(true)
    expect(analytics.track).toHaveBeenCalledWith(
      'learn_complete_success',
      expect.objectContaining({ content_scene_id: 'coffee' }),
      expect.objectContaining({ token: 1, once: expect.any(String) })
    )
  })
  it('连续点词逆序返回时只保存最后点击的句子位置', async () => {
    const page = useScenePage()
    await page.initialize('coffee')
    let resolve!: (value: unknown) => void
    runtime.scene.getEntry.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done
        })
    )
    const span = {
      entry_id: 'latte',
      source_locator: word.source_locator,
      entry_version: 2
    } as never
    const first = page.inspectSentence({ source_locator: 's1' } as never, span)
    await page.inspectSentence({ source_locator: 's2' } as never, span)
    resolve({ english: 'latte' })
    await first
    const positions = vi
      .mocked(uni.setStorageSync)
      .mock.calls.filter(([key]) => key === 'juya.scene-position.coffee')
      .map(([, position]) => position.entry_id)
    expect(positions).toEqual(['s2'])
  })
  it('旧页面收藏请求迟到拒绝不会清空新页面的场景', async () => {
    const page = useScenePage()
    await page.initialize('coffee')
    let reject!: (error: unknown) => void
    runtime.client.post.mockImplementationOnce(
      () =>
        new Promise((_resolve, fail) => {
          reject = fail
        })
    )
    const saving = page.favorite(word as never)
    await page.initialize('coffee')
    reject({ status: 403 })
    await saving
    expect(page.fullModel.value?.sceneId).toBe('coffee')
  })

  it('页面隐藏后完成响应不会授权跳转到成果页', async () => {
    const page = useScenePage()
    await page.initialize('coffee')
    let resolve!: () => void
    runtime.scene.complete.mockImplementationOnce(
      () =>
        new Promise<void>((done) => {
          resolve = done
        })
    )
    const completing = page.complete()
    await vi.waitFor(() => expect(resolve).toBeTypeOf('function'))
    page.disposeAudio()
    resolve()
    expect(await completing).toBe(false)
  })

  it('页面隐藏后迟到的点词响应不会写入阅读进度', async () => {
    const page = useScenePage()
    await page.initialize('coffee')
    let resolve!: (value: unknown) => void
    runtime.scene.getEntry.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done
        })
    )
    const inspecting = page.inspectSentence(
      { source_locator: 's1' } as never,
      {
        entry_id: 'latte',
        source_locator: word.source_locator,
        entry_version: 2
      } as never
    )
    page.disposeAudio()
    resolve({ english: 'latte' })
    await inspecting
    expect(uni.setStorageSync).not.toHaveBeenCalled()
  })
  it('返回页面时重新核验自己的场景，避免显示其他页写入的正文', async () => {
    const page = useScenePage()
    await page.initialize('coffee')
    page.disposeAudio()
    page.scene.model = {
      kind: 'FULL',
      sceneId: 'another-scene',
      entries: [],
      description: '',
      title: '',
      chineseTitle: '',
      series: ''
    }
    expect(page.fullModel.value).toBeUndefined()
    hooks.show?.()
    await vi.waitFor(() => expect(page.fullModel.value?.sceneId).toBe('coffee'))
    expect(runtime.scene.open).toHaveBeenCalledTimes(2)
  })
  it('保存来源位置同时持久化本地恢复信息', async () => {
    const page = useScenePage()
    await page.initialize('coffee')
    page.savePosition({ entry_id: 's2', offset: 66 })
    expect(uni.setStorageSync).toHaveBeenCalledWith('juya.scene-position.coffee', {
      entry_id: 's2',
      offset: 66
    })
  })
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.stubGlobal('uni', {
      getStorageSync: () => [],
      setStorageSync: vi.fn(),
      removeStorageSync: vi.fn(),
      showToast: vi.fn()
    })
    runtime.scene.open.mockResolvedValue(full)
    runtime.scene.getResource.mockResolvedValue({ url: 'signed-image' })
    runtime.scene.getEntry.mockResolvedValue({
      english: 'latte',
      chinese: '拿铁',
      explanation: '真实释义',
      entry_id: 'latte',
      entry_version: 2,
      source_sentence_ids: ['s1'],
      sentence_snapshot: 'Get a latte.',
      source_locator: word.source_locator,
      scene_id: 'coffee',
      revision_id: 'revision'
    })
  })

  it('以发布修订和词条版本请求权威词卡，关闭保持 scrollTop', async () => {
    const page = useScenePage()
    await page.initialize('coffee')
    page.scrollTop.value = 126
    await page.inspectEntry(word as never)
    expect(runtime.scene.getEntry).toHaveBeenCalledWith('coffee', 'latte', {
      revision_id: 'revision',
      entry_version: 2,
      source_locator: word.source_locator
    })
    expect(page.scene.sheet?.snapshot.entry.text).toBe('latte')
    expect(page.scene.sheet?.snapshot.entry.sentence_snapshot).toBe('Get a latte.')
    page.closeSheet()
    expect(page.scrollTop.value).toBe(126)
    expect(page.scrollTarget.value).toBe('')
  })

  it('原图来自 getResource 的修订约束签名而不是固定素材', async () => {
    const page = useScenePage()
    await page.initialize('coffee')
    expect(runtime.scene.getResource).toHaveBeenCalledWith('coffee', 'image', 'revision')
    expect(page.originalImageUrl.value).toBe('signed-image')
  })

  it('权限失效的词卡响应清空正文和原图', async () => {
    const page = useScenePage()
    await page.initialize('coffee')
    runtime.scene.getEntry.mockRejectedValue({ status: 403 })
    await page.inspectEntry(word as never)
    expect(page.scene.model).toBeUndefined()
    expect(page.originalImageUrl.value).toBe('')
  })

  it('关闭或退出后迟到的词卡响应不再打开弹层', async () => {
    const page = useScenePage()
    await page.initialize('coffee')
    let resolve!: (value: unknown) => void
    runtime.scene.getEntry.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done
        })
    )
    const pending = page.inspectEntry(word as never)
    page.closeSheet()
    resolve({ english: 'latte' })
    await pending
    expect(page.scene.sheet).toBeUndefined()
  })

  it('收藏携带固定发布版本及服务端来源定位', async () => {
    const page = useScenePage()
    await page.initialize('coffee')
    await page.inspectEntry(word as never)
    await page.favorite(page.scene.sheet!.snapshot.entry)
    expect(runtime.client.post.mock.calls[0][1]).toMatchObject({
      scene_id: 'coffee',
      revision_id: 'revision',
      entry_version: 2,
      source_locator: word.source_locator
    })
    expect(page.scene.sheet?.snapshot.open).toBe(true)
    expect(page.scene.sheet?.snapshot.entry.favorited).toBe(true)
  })
})
