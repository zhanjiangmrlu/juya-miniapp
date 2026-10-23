// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { afterEach, expect, it, vi } from 'vitest'

const hooks = vi.hoisted(() => ({
  show: undefined as undefined | (() => void),
  hide: undefined as undefined | (() => void)
}))
vi.mock('@dcloudio/uni-app', () => ({
  onShow: (callback: typeof hooks.show) => {
    hooks.show = callback
  },
  onHide: (callback: typeof hooks.hide) => {
    hooks.hide = callback
  }
}))
vi.mock('@/services/navigation', () => ({ backTo: vi.fn() }))
import AppPage from '@/components/app-page/app-page.vue'
import { runtimeMode } from '@/services/runtime-mode'

afterEach(() => {
  runtimeMode.update({ apiCategory: 'default' })
  vi.unstubAllGlobals()
})
it('keeps unavailable native channels hidden across preparation, hide, and official mode changes', async () => {
  vi.stubGlobal('uni', {
    getWindowInfo: () => ({ windowWidth: 375, statusBarHeight: 20 }),
    getMenuButtonBoundingClientRect: () => ({ left: 280, bottom: 60 }),
    showShareMenu: vi.fn(),
    hideShareMenu: vi.fn()
  })
  const page = mount(AppPage, {
    props: { title: '场景学习', shareable: true, shareChannels: { friends: true, timeline: false } }
  })
  hooks.show?.()
  expect(uni.showShareMenu).toHaveBeenLastCalledWith({
    withShareTicket: false,
    menus: ['shareAppMessage']
  })
  expect(uni.hideShareMenu).toHaveBeenLastCalledWith({ menus: ['shareTimeline'] })
  hooks.hide?.()
  vi.mocked(uni.showShareMenu).mockClear()
  await page.setProps({ shareChannels: { friends: true, timeline: true } })
  expect(uni.showShareMenu).not.toHaveBeenCalled()
  hooks.show?.()
  expect(uni.showShareMenu).toHaveBeenLastCalledWith({
    withShareTicket: false,
    menus: ['shareAppMessage', 'shareTimeline']
  })
  runtimeMode.update({ apiCategory: 'browseOnly' })
  await page.vm.$nextTick()
  expect(uni.hideShareMenu).toHaveBeenLastCalledWith({
    menus: ['shareAppMessage', 'shareTimeline']
  })
  page.unmount()
})
