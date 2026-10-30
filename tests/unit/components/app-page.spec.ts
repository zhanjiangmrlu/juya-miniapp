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

it('covers the status bar and viewport with the page artwork and keeps native edges cream', () => {
  const setBackgroundColor = vi.fn()
  vi.stubGlobal('uni', {
    getWindowInfo: () => ({ windowWidth: 390, statusBarHeight: 47 }),
    getMenuButtonBoundingClientRect: () => ({ left: 280, bottom: 87 }),
    hideShareMenu: vi.fn(),
    setBackgroundColor
  })
  const page = mount(AppPage, {
    props: { title: '句芽英语', backgroundImage: '/static/listening/home-watercolor@3x.jpg' }
  })
  hooks.show?.()
  expect(setBackgroundColor).toHaveBeenCalledWith({
    backgroundColor: '#fffcf5',
    backgroundColorTop: '#fffcf5',
    backgroundColorBottom: '#fffcf5'
  })
  const image = page.get('.page-background')
  expect(image.attributes('mode')).toBe('aspectFill')
  expect(image.element.parentElement).toBe(page.element)
  expect(page.element.firstElementChild).toBe(image.element)
  page.unmount()
})

it('loads artwork at its original ratio and leaves readable content after asset failure', async () => {
  vi.stubGlobal('uni', {
    getWindowInfo: () => ({ windowWidth: 390, statusBarHeight: 47 }),
    getMenuButtonBoundingClientRect: () => ({ left: 280, bottom: 87 }),
    hideShareMenu: vi.fn()
  })
  const page = mount(AppPage, {
    props: { title: '学习记录', backgroundKind: 'records' },
    slots: { default: '<text>今日已学</text>' }
  })
  const art = page.get('.page-artwork')
  expect(art.attributes('src')).toContain('/backgrounds/records-journal.png')
  expect(art.attributes('mode')).toBe('widthFix')
  await art.trigger('error')
  expect(page.find('.page-artwork').exists()).toBe(false)
  expect(page.text()).toContain('今日已学')
  page.unmount()
})
