// @vitest-environment happy-dom
import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, expect, it, vi } from 'vitest'
const ports = vi.hoisted(() => ({
  load: () => undefined as void,
  expired: () => undefined as void,
  request: vi.fn()
}))
vi.mock('@dcloudio/uni-app', () => ({
  onLoad: (cb: () => void) => {
    ports.load = cb
  },
  onUnload: vi.fn(),
  onShow: vi.fn(),
  onHide: vi.fn(),
  onBackPress: vi.fn(),
  onShareAppMessage: vi.fn(),
  onShareTimeline: vi.fn()
}))
vi.mock('@/services/api', () => ({
  session: { userId: () => 'A', identity: () => '0:A', request: ports.request },
  operations: { pending: () => false },
  onSessionExpired: (cb: () => void) => {
    ports.expired = cb
    return () => undefined
  }
}))
vi.mock('@/stores/account-store', () => ({
  useAccountStore: () => ({
    ensure: async () => true,
    restore: async () => ({
      id: 'A',
      nickname: 'Private learner',
      phone: '13800000000',
      wechat_contact: 'isolated-contact',
      avatar_id: null,
      profile_version: 1,
      contact_version: 1
    }),
    acceptProfile: vi.fn(),
    refreshAvatar: async () => undefined,
    avatarURL: ''
  })
}))
import Contact from '@/sub-packages/account/contact-edit.vue'
import Identity from '@/sub-packages/account/identity-edit.vue'
beforeEach(() => {
  ports.request.mockReset().mockResolvedValue({ avatar_limit_bytes: 1024 })
  vi.stubGlobal('uni', {
    canIUse: () => true,
    getStorageSync: () => undefined,
    chooseImage: vi.fn(),
    getFileInfo: vi.fn()
  })
})
it.each([Contact, Identity])(
  'clears visible private editing inputs immediately when identity expires',
  async (component) => {
    const page = shallowMount(component, {
      global: { stubs: { AppPage: { template: '<div><slot /></div>' } } }
    })
    ports.load()
    await flushPromises()
    expect(page.findAll('input').length).toBeGreaterThan(0)
    ports.expired()
    await flushPromises()
    expect(page.findAll('input')).toHaveLength(0)
    expect(page.findComponent({ name: 'AppGuestState' }).exists()).toBe(true)
    page.unmount()
  }
)
it('discards a late avatar chooser callback after the editor identity has ended', async () => {
  const page = shallowMount(Identity, {
    global: { stubs: { AppPage: { template: '<div><slot /></div>' } } }
  })
  ports.load()
  await flushPromises()
  const chooser = page
    .findAll('button')
    .filter((button) => button.text().includes('更换头像'))
    .at(-1)!
  await chooser.trigger('click')
  const choice = vi.mocked(uni.chooseImage).mock.calls[0]![0]!
  ports.expired()
  choice.success?.({ tempFilePaths: ['wxfile://old-avatar'], tempFiles: [] } as never)
  await flushPromises()
  expect(uni.getFileInfo).not.toHaveBeenCalled()
  expect(ports.request.mock.calls.some(([path]) => path === '/api/mini/v1/me/avatar')).toBe(false)
  page.unmount()
})
