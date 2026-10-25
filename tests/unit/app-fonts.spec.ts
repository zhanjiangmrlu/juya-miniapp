// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const hooks = vi.hoisted(() => ({ launch: undefined as undefined | (() => unknown) }))
const ports = vi.hoisted(() => ({ syncMode: vi.fn() }))

vi.mock('@dcloudio/uni-app', () => ({
  onLaunch: (callback: () => unknown) => {
    hooks.launch = callback
  },
  onShow: vi.fn(),
  onHide: vi.fn()
}))
vi.mock('@/stores/account-store', () => ({ useAccountStore: () => ({}) }))
vi.mock('@/features/learning/learning-audio-session', () => ({
  resetLearningAudioSession: vi.fn()
}))
vi.mock('@/services/runtime-mode', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/runtime-mode')>()),
  syncRuntimeMode: ports.syncMode
}))

const loadFontFace = vi.fn<(options: Parameters<typeof uni.loadFontFace>[0]) => void>()

/** 挂载真实 App 启动流程，不创建页面或业务网络请求 */
const boot = async () => {
  const App = (await import('@/App.vue')).default
  const wrapper = mount({ ...App, render: () => null })
  const result = hooks.launch?.()
  return { wrapper, result }
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  loadFontFace.mockReset()
  hooks.launch = undefined
  vi.stubEnv('VITE_REMOTE_FONTS', 'true')
  vi.stubEnv(
    'VITE_STATIC_ASSET_BASE_URL',
    'https://juya-test.oss-cn-shenzhen.aliyuncs.com/miniapp/static/'
  )
  vi.stubGlobal('uni', {
    loadFontFace,
    getStorageSync: () => undefined,
    getWindowInfo: () => ({ windowWidth: 390, statusBarHeight: 20 }),
    getMenuButtonBoundingClientRect: () => ({ left: 300, bottom: 60 })
  })
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

it('starts all four global font loads without waiting for network callbacks or delaying runtime mode', async () => {
  const { wrapper, result } = await boot()
  expect(result).toBeUndefined()
  expect(ports.syncMode).toHaveBeenCalledOnce()
  expect(loadFontFace.mock.calls.map(([options]) => [options.family, options.source])).toEqual([
    [
      'DM Sans',
      'url("https://juya-test.oss-cn-shenzhen.aliyuncs.com/miniapp/static/fonts/dm-sans-19b2ba846548.woff")'
    ],
    [
      'Fraunces',
      'url("https://juya-test.oss-cn-shenzhen.aliyuncs.com/miniapp/static/fonts/fraunces-regular-1a07e715bff9.woff")'
    ],
    [
      'Fraunces',
      'url("https://juya-test.oss-cn-shenzhen.aliyuncs.com/miniapp/static/fonts/fraunces-italic-0e42d420e3d2.woff")'
    ],
    [
      'Juya UI Chinese',
      'url("https://juya-test.oss-cn-shenzhen.aliyuncs.com/miniapp/static/fonts/juya-ui-chinese-2de0b76bda1d.woff")'
    ]
  ])
  expect(loadFontFace.mock.calls.every(([options]) => options.global === true)).toBe(true)
  expect(loadFontFace.mock.calls.map(([options]) => options.desc)).toEqual([
    { style: 'normal', weight: '100 900', variant: 'normal' },
    { style: 'normal', weight: '100 900', variant: 'normal' },
    { style: 'italic', weight: '100 900', variant: 'normal' },
    { style: 'normal', weight: '100 900', variant: 'normal' }
  ])
  hooks.launch?.()
  expect(loadFontFace).toHaveBeenCalledTimes(4)
  wrapper.unmount()
})

it('allows all font requests to fail without rejecting application startup', async () => {
  const { wrapper, result } = await boot()
  expect(loadFontFace).toHaveBeenCalledTimes(4)
  for (const [options] of loadFontFace.mock.calls) {
    expect(() => options.fail?.({ errMsg: 'loadFontFace:fail network unavailable' })).not.toThrow()
  }
  expect(result).toBeUndefined()
  expect(ports.syncMode).toHaveBeenCalledOnce()
  wrapper.unmount()
})

it('continues loading the remaining faces when the native font API throws for one face', async () => {
  loadFontFace.mockImplementationOnce(() => {
    throw new Error('native font loading unavailable')
  })
  const { wrapper, result } = await boot()
  expect(result).toBeUndefined()
  expect(loadFontFace).toHaveBeenCalledTimes(4)
  expect(ports.syncMode).toHaveBeenCalledOnce()
  wrapper.unmount()
})

it.each([
  [
    'production fonts remain embedded',
    'false',
    'https://juya.oss-cn-shenzhen.aliyuncs.com/miniapp/static'
  ],
  ['missing static host uses system fonts', 'true', ''],
  ['non-HTTPS font host uses system fonts', 'true', 'http://invalid.example/static']
])('does not request remote fonts when %s', async (_case, enabled, base) => {
  vi.stubEnv('VITE_REMOTE_FONTS', enabled)
  vi.stubEnv('VITE_STATIC_ASSET_BASE_URL', base)
  const { wrapper, result } = await boot()
  expect(result).toBeUndefined()
  expect(loadFontFace).not.toHaveBeenCalled()
  expect(ports.syncMode).toHaveBeenCalledOnce()
  wrapper.unmount()
})

it('uses the existing system font stack when the native font API is unavailable', async () => {
  vi.stubGlobal('uni', {})
  const { wrapper, result } = await boot()
  expect(result).toBeUndefined()
  expect(ports.syncMode).toHaveBeenCalledOnce()
  wrapper.unmount()
})

it('selects system fonts while requests are pending and switches each face only after success', async () => {
  const { wrapper } = await boot()
  const AppPage = (await import('@/components/app-page/app-page.vue')).default
  const page = mount(AppPage, {
    props: { title: '句芽英语' },
    global: { stubs: { ShareSummary: true } }
  })
  const element = page.element as HTMLElement
  expect(element.style.fontFamily).toContain('PingFang SC')
  expect(element.style.fontFamily).not.toContain('DM Sans')
  expect(element.style.getPropertyValue('--app-latin-font')).toBe('sans-serif')
  expect(element.style.getPropertyValue('--app-serif-italic-font')).toBe('Georgia, serif')
  expect(loadFontFace).toHaveBeenCalledTimes(4)
  loadFontFace.mock.calls[0][0].success?.({ errMsg: 'loadFontFace:ok' })
  loadFontFace.mock.calls[2][0].success?.({ errMsg: 'loadFontFace:ok' })
  loadFontFace.mock.calls[3][0].fail?.({ errMsg: 'loadFontFace:fail offline' })
  await page.vm.$nextTick()
  expect(element.style.fontFamily).toContain('DM Sans')
  expect(element.style.getPropertyValue('--app-latin-font')).toBe("'DM Sans', sans-serif")
  expect(element.style.fontFamily).not.toContain('Juya UI Chinese')
  expect(element.style.getPropertyValue('--app-serif-italic-font')).toBe('Fraunces, Georgia, serif')
  page.unmount()
  wrapper.unmount()
})

it.each([
  [2, 1, 'Georgia, serif', 'Fraunces, Georgia, serif'],
  [1, 2, 'Fraunces, Georgia, serif', 'Georgia, serif']
])(
  'keeps serif styles independent when face %s succeeds and face %s fails',
  async (success, failure, normal, italic) => {
    const { wrapper } = await boot()
    const AppPage = (await import('@/components/app-page/app-page.vue')).default
    const page = mount(AppPage, {
      props: { title: '句芽英语' },
      global: { stubs: { ShareSummary: true } }
    })
    const element = page.element as HTMLElement
    expect(element.style.getPropertyValue('--app-serif-font')).toBe('Georgia, serif')
    expect(element.style.getPropertyValue('--app-serif-italic-font')).toBe('Georgia, serif')
    loadFontFace.mock.calls[Number(success)][0].success?.({ errMsg: 'loadFontFace:ok' })
    await page.vm.$nextTick()
    expect(element.style.getPropertyValue('--app-serif-font')).toBe(normal)
    expect(element.style.getPropertyValue('--app-serif-italic-font')).toBe(italic)
    loadFontFace.mock.calls[Number(failure)][0].fail?.({ errMsg: 'loadFontFace:fail offline' })
    await page.vm.$nextTick()
    expect(element.style.getPropertyValue('--app-serif-font')).toBe(normal)
    expect(element.style.getPropertyValue('--app-serif-italic-font')).toBe(italic)
    page.unmount()
    wrapper.unmount()
  }
)
