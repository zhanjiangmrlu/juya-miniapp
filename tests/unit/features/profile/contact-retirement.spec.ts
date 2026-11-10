// @vitest-environment happy-dom
import { shallowMount } from '@vue/test-utils'
import { afterEach, expect, it, vi } from 'vitest'

const hooks = vi.hoisted(() => {
  vi.stubGlobal('uni', { getStorageSync: () => undefined })
  return { load: undefined as undefined | (() => void) }
})
vi.mock('@dcloudio/uni-app', () => ({
  onLoad: (callback: () => void) => {
    hooks.load = callback
  },
  onShow: vi.fn(),
  onHide: vi.fn(),
  onUnload: vi.fn(),
  onBackPress: vi.fn(),
  onShareAppMessage: vi.fn(),
  onShareTimeline: vi.fn()
}))
vi.mock('@/services/api', () => ({
  session: { userId: () => null },
  operations: { pending: () => false },
  onSessionExpired: () => () => undefined
}))
vi.mock('@/stores/account-store', () => ({
  useAccountStore: () => ({ ensure: async () => false })
}))
import { Routes } from '@/shared/constants/navigation'
import Contact from '@/sub-packages/account/contact-edit.vue'

afterEach(() => vi.unstubAllGlobals())
it('returns the retired contact route to account without authentication or inputs', () => {
  const switchTab = vi.fn(),
    login = vi.fn(),
    request = vi.fn()
  vi.stubGlobal('uni', { switchTab, login, request })
  vi.stubGlobal('wx', { login })
  const page = shallowMount(Contact)
  hooks.load?.()
  expect(switchTab).toHaveBeenCalledExactlyOnceWith({ url: Routes.PROFILE })
  expect(page.findAll('input')).toHaveLength(0)
  expect(page.text()).not.toContain('联系方式')
  expect(login).not.toHaveBeenCalled()
  expect(request).not.toHaveBeenCalled()
  page.unmount()
})
