// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, expect, it, vi } from 'vitest'
const ports = vi.hoisted(() => ({
  load: undefined as ((query: Record<string, string>) => void) | undefined,
  navigateTo: vi.fn()
}))
vi.mock('@dcloudio/uni-app', () => ({
  onLoad: (callback: typeof ports.load) => {
    ports.load = callback
  },
  onShow: () => {},
  onUnload: () => {},
  onPageScroll: () => {}
}))
vi.hoisted(() => {
  vi.stubGlobal('uni', {
    getStorageSync: () => '',
    navigateTo: ports.navigateTo,
    pageScrollTo: vi.fn()
  })
})
vi.mock('@/components/app-page/app-page.vue', () => ({
  default: { template: '<div><slot /></div>' }
}))
vi.mock('@/components/app-privacy-sheet/app-privacy-sheet.vue', () => ({
  default: {
    template: '<div data-privacy><button @click="$emit(\'close\')">关闭隐私说明</button></div>'
  }
}))
import { loginPromptTarget } from '@/services/login-prompt'
import Settings from '@/sub-packages/account/settings.vue'
afterEach(() => {
  vi.clearAllMocks()
})
it('is public and has only terms and privacy ordinary rows; viewing and closing never logs in', async () => {
  const view = mount(Settings)
  ports.load?.({})
  expect(view.findAll('.settings-row')).toHaveLength(2)
  expect(view.text()).toContain('用户协议')
  expect(view.text()).toContain('隐私说明')
  await view.get('[data-action="privacy"]').trigger('click')
  expect(view.find('[data-privacy]').exists()).toBe(true)
  await view.get('[data-privacy] button').trigger('click')
  expect(view.find('[data-privacy]').exists()).toBe(false)
  expect(loginPromptTarget.value).toBe('')
  expect(ports.navigateTo).not.toHaveBeenCalled()
  view.unmount()
})
it('old privacy query opens the same sheet while explicit terms opens the formal policy', async () => {
  const view = mount(Settings)
  ports.load?.({ privacy: '1' })
  await flushPromises()
  expect(view.find('[data-privacy]').exists()).toBe(true)
  await view.get('[data-action="terms"]').trigger('click')
  expect(ports.navigateTo).toHaveBeenCalledWith(
    expect.objectContaining({ url: '/sub-packages/account/policy?kind=terms' })
  )
  view.unmount()
})
