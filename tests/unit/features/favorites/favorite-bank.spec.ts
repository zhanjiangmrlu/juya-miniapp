// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { reactive } from 'vue'

import FavoriteBankPage from '@/features/favorites/components/favorite-bank-page.vue'
import { useFavoriteStore } from '@/stores/favorites'

const dependencies = vi.hoisted(() => ({
  show: undefined as (() => Promise<void>) | undefined,
  hide: undefined as (() => void) | undefined,
  unload: undefined as (() => void) | undefined,
  list: vi.fn(),
  remove: vi.fn(),
  scroll: vi.fn(),
  modal: vi.fn(),
  session: { cleanupGeneration: 0 }
}))
vi.mock('@/stores/session', () => ({ useSessionStore: () => dependencies.session }))
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
  getRuntimeServices: () => ({
    favorites: { list: dependencies.list, remove: dependencies.remove }
  })
}))
vi.mock('@/stores/audio', () => ({ useAudioStore: () => ({ snapshot: { status: 'IDLE' } }) }))
beforeEach(() => {
  setActivePinia(createPinia())
  vi.resetAllMocks()
  dependencies.session = reactive({ cleanupGeneration: 0 })
  vi.stubGlobal('uni', { pageScrollTo: dependencies.scroll, showModal: dependencies.modal })
})
afterEach(() => vi.unstubAllGlobals())
it('清空学习或切换账号后迟到银行读取不能滚动新账号页面', async () => {
  let finish!: (page: unknown) => void
  dependencies.list.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  const wrapper = mount(FavoriteBankPage, {
    global: { stubs: { PersonalPage: { template: '<div><slot /></div>' } } }
  })
  const showing = dependencies.show?.()
  dependencies.session.cleanupGeneration++
  finish({ items: [], has_more: false, next_cursor: null })
  await showing
  expect(dependencies.scroll).not.toHaveBeenCalled()
  wrapper.unmount()
})
it('旧账号筛选弹窗确认不能修改新账号银行筛选', async () => {
  const wrapper = mount(FavoriteBankPage, {
    global: { stubs: { PersonalPage: { template: '<div><slot /></div>' } } }
  })
  dependencies.list.mockResolvedValue({ items: [], has_more: false, next_cursor: null })
  await dependencies.show?.()
  await wrapper.find('.filter-action').trigger('click')
  dependencies.session.cleanupGeneration++
  dependencies.modal.mock.calls[0]?.[0].success({ confirm: true, content: 'old-account' })
  expect(useFavoriteStore().tabState.VOCABULARY.filter).toBe('')
  wrapper.unmount()
})
it('离页后迟到取消失败不能在新页面写入旧操作错误', async () => {
  let fail!: (error: unknown) => void
  dependencies.remove.mockImplementation(
    () =>
      new Promise((_resolve, reject) => {
        fail = reject
      })
  )
  const store = useFavoriteStore()
  store.items = [{ id: 'one', entry_type: 'VOCABULARY', english: 'coffee', sources: [] } as never]
  const wrapper = mount(FavoriteBankPage, {
    global: { stubs: { PersonalPage: { template: '<div><slot /></div>' } } }
  })
  dependencies.list.mockResolvedValue({ items: store.items, has_more: false, next_cursor: null })
  await dependencies.show?.()
  await wrapper.find('.favorite-state').trigger('click')
  dependencies.hide?.()
  fail(new Error('offline'))
  await flushPromises()
  expect(wrapper.text()).not.toContain('取消收藏失败')
  wrapper.unmount()
})
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
