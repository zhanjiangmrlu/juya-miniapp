// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive, ref } from 'vue'

import PositionPageView from '@/features/scene/components/position-page-view.vue'

const dependencies = vi.hoisted(() => ({
  load: undefined as ((query?: Record<string, string>) => Promise<void>) | undefined,
  navigate: vi.fn(),
  play: vi.fn(),
  getEntry: vi.fn()
}))
vi.mock('@dcloudio/uni-app', () => ({
  onLoad: (hook: typeof dependencies.load) => {
    dependencies.load = hook
  },
  onHide: vi.fn(),
  onUnload: vi.fn()
}))
vi.mock('@/shared/navigation/navigate', () => ({ navigate: dependencies.navigate }))
vi.mock('@/services/runtime', () => ({
  getRuntimeServices: () => ({ scene: { getEntry: dependencies.getEntry } })
}))
const target = { target_id: 'audio', version_id: 'v1', target_type: 'sentence' }
const entry = { entry_id: 'word', entry_type: 'VOCABULARY', source_locator: 's1', text: 'old' }
const audio = reactive({ snapshot: { status: 'IDLE' }, currentKey: null })
const fullModel = ref({
  kind: 'FULL',
  chineseTitle: '问路',
  title: 'Directions',
  sceneId: 'scene-1',
  revision_id: 'revision-1',
  entries: [entry]
})
vi.mock('@/features/scene/use-scene-page', () => ({
  useScenePage: () => ({
    audio,
    fullModel,
    sceneId: ref('scene-1'),
    scene: {
      loading: false,
      dialogueEntries: [{ entry_id: 's1', source_locator: 's1', text: 'Hello', audio: target }]
    },
    initialize: async () => {},
    disposeAudio: vi.fn(),
    handleFailure: vi.fn(),
    play: dependencies.play
  })
}))
beforeEach(() => {
  vi.clearAllMocks()
  audio.snapshot.status = 'IDLE'
  dependencies.getEntry.mockResolvedValue({
    english: 'hello',
    chinese: '你好',
    source_sentence_ids: ['s1']
  })
})

describe('场景恢复位置与来源展示', () => {
  it('解码微信路由中的来源定位后再查询固定词条版本', async () => {
    const wrapper = mount(PositionPageView, {
      props: { source: true },
      global: { stubs: { ScenePageLayout: { template: '<div><slot /></div>' } } }
    })
    await dependencies.load?.({
      sceneId: 'scene-1',
      sourceLocator: 'vocabulary%3Aword',
      entryId: 'word',
      revisionId: 'revision-1',
      entryVersion: '1'
    })
    expect(dependencies.getEntry).toHaveBeenCalledWith('scene-1', 'word', {
      revision_id: 'revision-1',
      entry_version: 1,
      source_locator: 'vocabulary:word'
    })
    expect(wrapper.get('.scene-subtitle').text()).toContain('hello')
    wrapper.unmount()
  })

  it('播放状态响应更新，播放按钮仍只播放当前句', async () => {
    const wrapper = mount(PositionPageView, {
      global: { stubs: { ScenePageLayout: { template: '<div><slot /></div>' } } }
    })
    await dependencies.load?.({ sceneId: 'scene-1', sourceLocator: 's1' })
    expect(wrapper.get('.scene-subtitle').text()).toBe('问路 · 已恢复阅读位置')
    expect(wrapper.findAll('.card-status')[1].text()).toBe('可播放')
    audio.snapshot.status = 'PLAYING'
    await flushPromises()
    expect(wrapper.findAll('.card-status')[1].text()).toBe('播放中')
    await wrapper.findAll('.position-card')[1].trigger('click')
    expect(dependencies.play).toHaveBeenCalledWith(target)
    expect(dependencies.navigate).not.toHaveBeenCalled()
    wrapper.unmount()
  })
  it('来源模式即使正在播放也显示当前句，按钮只返回原文', async () => {
    audio.snapshot.status = 'PLAYING'
    const wrapper = mount(PositionPageView, {
      props: { source: true },
      global: { stubs: { ScenePageLayout: { template: '<div><slot /></div>' } } }
    })
    await dependencies.load?.({ sceneId: 'scene-1', sourceLocator: 's1', entryId: 'word' })
    await flushPromises()
    expect(wrapper.get('.scene-subtitle').text()).toBe('从收藏词汇「hello」返回原文')
    expect(wrapper.findAll('.card-status')[1].text()).toBe('当前句')
    await wrapper.findAll('.position-card')[1].trigger('click')
    expect(dependencies.navigate).toHaveBeenCalledWith({
      type: 'redirectTo',
      url: '/sub-packages/scene/dialogue?sceneId=scene-1&sourceLocator=s1'
    })
    expect(dependencies.play).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
