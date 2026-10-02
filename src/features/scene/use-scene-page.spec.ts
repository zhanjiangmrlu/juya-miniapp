import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useScenePage } from './use-scene-page'

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
