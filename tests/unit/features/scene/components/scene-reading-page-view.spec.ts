// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, describe, expect, it, vi } from 'vitest'

import SceneReadingPageView from '@/features/scene/components/scene-reading-page-view.vue'
import { useSessionStore } from '@/stores/session'

const hooks = vi.hoisted(() => ({
  noDialogue: false,
  load: undefined as ((query: Record<string, string>) => Promise<void>) | undefined,
  hide: undefined as (() => void) | undefined
}))
vi.mock('@dcloudio/uni-app', () => ({
  onLoad: (listener: typeof hooks.load) => {
    hooks.load = listener
  },
  onHide: (listener: typeof hooks.hide) => {
    hooks.hide = listener
  },
  onUnload: vi.fn(),
  onShow: vi.fn(),
  onPageScroll: vi.fn()
}))
vi.mock('@/features/scene/use-scene-page', async () => {
  const { ref } = await import('vue')
  return {
    useScenePage: () => ({
      audio: { snapshot: { status: 'IDLE' }, currentKey: null },
      disposeAudio: vi.fn(),
      favorite: vi.fn(),
      play: vi.fn(),
      savePosition: vi.fn(),
      initialize: async () => undefined,
      fullModel: ref({ content_version: 2, title: 'Fixture', chineseTitle: '测试', dialogue: [] }),
      pendingFavoriteIds: ref([]),
      sceneId: ref('fixture'),
      scrollTop: ref(0),
      scene: {
        dialogueEntries: hooks.noDialogue ? [] : [{ entry_id: 's1', source_locator: 's1' }],
        vocabularyEntries: [],
        phraseEntries: [],
        viewState: { chineseVisible: false },
        loading: false
      }
    })
  }
})
afterEach(() => {
  hooks.noDialogue = false
  vi.unstubAllGlobals()
})
describe('场景来源定位生命周期', () => {
  it.each([false, true])('无对话=%s时仅有句子内容提供逐句跟读入口', (noDialogue) => {
    setActivePinia(createPinia())
    hooks.noDialogue = noDialogue
    const wrapper = mount(SceneReadingPageView, {
      global: {
        stubs: {
          ScenePageLayout: { template: '<div><slot /></div>' },
          SceneHeading: true,
          SceneReadingView: true,
          AudioButton: true
        }
      }
    })
    expect(wrapper.find('.fixed-action').exists()).toBe(!noDialogue)
    wrapper.unmount()
  })
  it.each(['离页', '清学习'])(
    '已找到来源但nextTick前%s，不滚动旧页面或启动高亮定时器',
    async (reason) => {
      setActivePinia(createPinia())
      const scroll = vi.fn()
      vi.stubGlobal('uni', { getStorageSync: vi.fn(), pageScrollTo: scroll })
      const wrapper = mount(SceneReadingPageView, {
        global: {
          stubs: {
            ScenePageLayout: { template: '<div><slot /></div>' },
            SceneHeading: true,
            SceneReadingView: true,
            AudioButton: true
          }
        }
      })
      const timers = vi.spyOn(globalThis, 'setTimeout')
      const loading = hooks.load!({ sceneId: 'fixture', contentVersion: '2', sourceLocator: 's1' })
      await Promise.resolve()
      if (reason === '离页') hooks.hide!()
      else useSessionStore().invalidateLearningData()
      await loading
      expect(scroll).not.toHaveBeenCalled()
      expect(timers.mock.calls.some(([, delay]) => delay === 2200)).toBe(false)
      timers.mockRestore()
      wrapper.unmount()
    }
  )
})
