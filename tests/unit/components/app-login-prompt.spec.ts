// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, expect, it, vi } from 'vitest'
const ports = vi.hoisted(() => ({
  load: vi.fn(),
  login: vi.fn(),
  confirm: vi.fn(),
  owner: null as string | null,
  published: false
}))
vi.mock('@/services/privacy', () => ({
  privacy: {
    loadPolicies: ports.load,
    published: () => ports.published,
    confirmed: () => false,
    confirmation: () => undefined,
    confirm: ports.confirm,
    version: () => 'v1',
    block: vi.fn(),
    restore: vi.fn(),
    choose: vi.fn()
  }
}))
vi.mock('@/stores/account-store', () => ({ useAccountStore: () => ({ login: ports.login }) }))
vi.mock('@/services/api', () => ({ session: { userId: () => ports.owner, invalidate: vi.fn() } }))
vi.mock('@/services/navigation', () => ({
  openLogin: vi.fn(),
  safeTarget: (value: string) => value
}))
import ConsentDialog from '@/components/app-consent-dialog/app-consent-dialog.vue'
import LoginPrompt from '@/components/app-login-prompt/app-login-prompt.vue'
import { dismissLoginPrompt, promptLogin } from '@/services/login-prompt'
import { loginReturn } from '@/services/login-return'
beforeEach(() => {
  dismissLoginPrompt()
  vi.clearAllMocks()
  ports.published = false
  ports.owner = null
  ports.confirm.mockReturnValue({
    confirmation_id: 'confirmation',
    terms_version: 't1',
    privacy_version: 'p1'
  })
  ports.login.mockImplementation(async () => {
    ports.owner = 'learner'
  })
  loginReturn.cancel()
  ports.load.mockRejectedValue(new Error('政策暂不可用'))
})
it('loads policy only for an active prompt and keeps failure retry and browsing without legacy login', async () => {
  const page = mount(LoginPrompt, {
    global: { stubs: { 'scroll-view': { template: '<view><slot /></view>' } } }
  })
  expect(ports.load).not.toHaveBeenCalled()
  promptLogin('/pages/home/index')
  await flushPromises()
  expect(ports.load).toHaveBeenCalledOnce()
  expect(page.text()).toContain('政策暂不可用')
  expect(page.text()).toContain('重试')
  expect(ports.login).not.toHaveBeenCalled()
  await page.get('.primary').trigger('click')
  await flushPromises()
  expect(ports.load).toHaveBeenCalledTimes(2)
  await page.get('.secondary').trigger('click')
  expect(page.find('[role="dialog"]').exists()).toBe(false)
  page.unmount()
})

it('invalidates a dismissed source while its explicit login is rechecking the formal policy', async () => {
  ports.published = true
  ports.load.mockResolvedValue(undefined)
  const page = mount(LoginPrompt, {
    global: { stubs: { 'scroll-view': { template: '<view><slot /></view>' } } }
  })
  promptLogin('/pages/home/index', 'full_audio')
  await flushPromises()
  let finish!: () => void
  ports.load.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve
      })
  )
  page.getComponent(ConsentDialog).vm.$emit('login', false)
  await flushPromises()
  dismissLoginPrompt()
  await flushPromises()
  finish()
  await flushPromises()
  expect(ports.login).not.toHaveBeenCalled()
  expect(ports.confirm).not.toHaveBeenCalled()
  expect(page.find('[role="dialog"]').exists()).toBe(false)
  page.unmount()
})
it('records the requested resource as the formal confirmation source and restores only the reading snapshot', async () => {
  ports.published = true
  ports.load.mockResolvedValue(undefined)
  const resumed = vi.fn()
  loginReturn.register(
    '/sub-packages/listening/article',
    () => ({
      page: '/sub-packages/listening/article',
      type: 'listening',
      id: 'article',
      tab: '',
      category: '',
      scroll: 250,
      translation: true,
      audioPosition: 12,
      playbackRate: 1.5,
      version: 'v1'
    }),
    resumed
  )
  const page = mount(LoginPrompt, {
    global: { stubs: { 'scroll-view': { template: '<view><slot /></view>' } } }
  })
  promptLogin('/sub-packages/listening/article?id=article', 'full_audio')
  await flushPromises()
  page.getComponent(ConsentDialog).vm.$emit('login', false)
  await flushPromises()
  expect(ports.confirm).toHaveBeenCalledWith('full_audio')
  expect(ports.login).toHaveBeenCalledOnce()
  expect(resumed).toHaveBeenCalledOnce()
  expect(loginReturn.take('/sub-packages/listening/article', 'article')).toMatchObject({
    scroll: 250,
    translation: true,
    audioPosition: 12,
    playbackRate: 1.5
  })
  expect(page.find('[role="dialog"]').exists()).toBe(false)
  page.unmount()
})
