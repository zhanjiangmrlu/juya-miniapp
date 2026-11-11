// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { afterEach, expect, it, vi } from 'vitest'

vi.hoisted(() => vi.stubGlobal('uni', { getStorageSync: () => undefined }))
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
it('enables generic sharing by default while respecting an explicit unavailable page', async () => {
  vi.stubGlobal('uni', {
    getWindowInfo: () => ({ windowWidth: 375, statusBarHeight: 20 }),
    getMenuButtonBoundingClientRect: () => ({ left: 280, bottom: 60 }),
    showShareMenu: vi.fn(),
    hideShareMenu: vi.fn()
  })
  const page = mount(AppPage, { props: { title: '句芽英语' } })
  hooks.show?.()
  expect(uni.showShareMenu).toHaveBeenLastCalledWith({
    withShareTicket: false,
    menus: ['shareAppMessage', 'shareTimeline']
  })
  await page.setProps({ shareable: false })
  expect(uni.hideShareMenu).toHaveBeenLastCalledWith({
    menus: ['shareAppMessage', 'shareTimeline']
  })
  page.unmount()
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

it('falls back once from WebP to the original artwork and resets on page background changes', async () => {
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
  expect(art.attributes('src')).toMatch(/\/backgrounds\/records-journal-[a-f0-9]{12}\.webp$/)
  expect(art.attributes('webp')).toBe('true')
  expect(art.attributes('mode')).toBe('widthFix')
  await art.trigger('error')
  expect(page.get('.page-artwork').attributes('src')).toContain('/backgrounds/records-journal.png')
  expect(page.get('.page-artwork').attributes('webp')).toBe('false')
  await page.get('.page-artwork').trigger('error')
  expect(page.find('.page-artwork').exists()).toBe(false)
  await page.setProps({ backgroundKind: 'scene' })
  expect(page.get('.page-artwork').attributes('src')).toMatch(/scene-window-[a-f0-9]{12}\.webp$/)
  expect(page.text()).toContain('今日已学')
  page.unmount()
})

it('keeps the browse-only summary scrollable inside a fixed viewport', () => {
  vi.stubGlobal('uni', {
    getWindowInfo: () => ({ windowWidth: 375, statusBarHeight: 20 }),
    getMenuButtonBoundingClientRect: () => ({ left: 280, bottom: 60 }),
    hideShareMenu: vi.fn()
  })
  runtimeMode.update({ apiCategory: 'browseOnly' })
  const page = mount(AppPage, {
    props: { title: '场景学习', fixedViewport: true, publicSummary: true },
    slots: { default: '<text>私人列表</text>' },
    global: {
      stubs: {
        'scroll-view': { template: '<div><slot /></div>' },
        ShareSummary: { template: '<text>分享摘要</text>' }
      }
    }
  })
  expect(page.get('.summary-scroll').text()).toBe('分享摘要')
  expect(page.text()).not.toContain('私人列表')
  page.unmount()
})

it.each([
  [
    false,
    'https://juya-test.oss-cn-shenzhen.aliyuncs.com/miniapp/static/brand/page-share-timeline-696f2baaa802.jpg',
    '把英语用进生活里'
  ],
  [true, '/static/brand/brand-share-square.png', '在真实场景里学英语']
] as const)(
  'uses the correct summary cover while preserving existing public summaries (%s)',
  async (publicSummary, cover, description) => {
    vi.stubGlobal('uni', {
      getWindowInfo: () => ({ windowWidth: 375, statusBarHeight: 20 }),
      getMenuButtonBoundingClientRect: () => ({ left: 280, bottom: 60 })
    })
    runtimeMode.update({ apiCategory: 'browseOnly' })
    const page = mount(AppPage, {
      props: { title: '句芽英语', fixedViewport: true, publicSummary },
      slots: { default: '<text>私人资料</text>' }
    })
    expect(page.get('.summary-cover').attributes('src')).toBe(cover)
    expect(page.text()).toContain(description)
    expect(page.text()).not.toContain('私人资料')
    if (!publicSummary) {
      await page.get('.summary-cover').trigger('error')
      expect(page.get('.summary-cover').attributes('src')).toBe(
        '/static/brand/page-share-timeline-fallback.jpg'
      )
    }
    page.unmount()
  }
)

it('falls back from JPEG paper to original PNG before retaining only the cream background', async () => {
  vi.stubGlobal('uni', {
    getWindowInfo: () => ({ windowWidth: 390, statusBarHeight: 47 }),
    getMenuButtonBoundingClientRect: () => ({ left: 280, bottom: 87 }),
    hideShareMenu: vi.fn()
  })
  const page = mount(AppPage, {
    props: { title: '场景学习', backgroundKind: 'scene' },
    slots: { default: '<text>可读正文</text>' }
  })
  expect(page.get('.paper-probe').attributes('src')).toMatch(/paper-texture-[a-f0-9]{12}\.jpg$/)
  await page.get('.paper-probe').trigger('error')
  expect(page.get('.paper-probe').attributes('src')).toContain('/backgrounds/paper-texture.png')
  expect(page.attributes('style')).toContain('paper-texture.png')
  await page.get('.paper-probe').trigger('error')
  expect(page.find('.paper-probe').exists()).toBe(false)
  expect(page.attributes('style')).not.toContain('background-image')
  expect(page.text()).toContain('可读正文')
  await page.setProps({ backgroundKind: 'reading' })
  expect(page.get('.paper-probe').attributes('src')).toMatch(/paper-texture-[a-f0-9]{12}\.jpg$/)
  page.unmount()
})

it('hides failed full-page artwork without blocking content and retries when its URL changes', async () => {
  vi.stubGlobal('uni', {
    getWindowInfo: () => ({ windowWidth: 390, statusBarHeight: 47 }),
    getMenuButtonBoundingClientRect: () => ({ left: 280, bottom: 87 })
  })
  const page = mount(AppPage, {
    props: { title: '首页', backgroundImage: 'https://static.example/home-v1.jpg' },
    slots: { default: '<button>开始学习</button>' }
  })
  expect(page.get('.page-background').attributes('src')).toBe('https://static.example/home-v1.jpg')
  expect(page.text()).toContain('开始学习')
  await page.get('.page-background').trigger('error')
  expect(page.find('.page-background').exists()).toBe(false)
  expect(page.text()).toContain('开始学习')
  await page.setProps({ backgroundImage: 'https://static.example/home-v2.jpg' })
  expect(page.get('.page-background').attributes('src')).toBe('https://static.example/home-v2.jpg')
  page.unmount()
})
