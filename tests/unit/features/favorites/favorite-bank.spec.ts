// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import FavoriteBankPage from '@/features/favorites/components/favorite-bank-page.vue'

const dependencies = vi.hoisted(() => ({
  show: undefined as (() => Promise<void>) | undefined,
  hide: undefined as (() => void) | undefined,
  unload: undefined as (() => void) | undefined,
  list: vi.fn(),
  scroll: vi.fn()
}))
vi.mock('@dcloudio/uni-app', () => ({
  onLoad: vi.fn(),
  onPageScroll: vi.fn(),
  onShow: (callback: typeof dependencies.show) => {
    dependencies.show = callback
  },
  onHide: (callback: typeof dependencies.hide) => {
    dependencies.hide = callback
  },
  onUnload: (callback: typeof dependencies.unload) => {
    dependencies.unload = callback
  }
}))
vi.mock('@/services/runtime', () => ({
  getRuntimeServices: () => ({ favorites: { list: dependencies.list } })
}))
vi.mock('@/stores/audio', () => ({ useAudioStore: () => ({ snapshot: { status: 'IDLE' } }) }))
beforeEach(() => {
  setActivePinia(createPinia())
  vi.resetAllMocks()
  vi.stubGlobal('uni', { pageScrollTo: dependencies.scroll })
})
afterEach(() => vi.unstubAllGlobals())
it.each(['hide', 'unload'] as const)(
  '银行请求期间%s，迟到响应不能滚动当前新页面',
  async (leave) => {
    let finish!: (page: { items: []; has_more: false; next_cursor: null }) => void
    dependencies.list.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    const wrapper = mount(FavoriteBankPage, {
      global: { stubs: { PersonalPage: { template: '<div><slot /></div>' } } }
    })
    const request = dependencies.show?.()
    dependencies[leave]?.()
    finish({ items: [], has_more: false, next_cursor: null })
    await request
    expect(dependencies.scroll).not.toHaveBeenCalled()
    wrapper.unmount()
  }
)
