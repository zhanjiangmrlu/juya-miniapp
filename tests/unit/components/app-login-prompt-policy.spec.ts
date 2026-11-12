// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { expect, it, vi } from 'vitest'
const pending = vi.hoisted(() => [] as Array<(value: unknown) => void>)
vi.mock('@/services/privacy', async () => {
  const { createPrivacyService } = await import('@/services/privacy-service')
  return {
    privacy: createPrivacyService({
      storage: { get: () => undefined, set: () => undefined, remove: () => undefined },
      key: () => 'confirmation',
      request: async <T>() => ({}) as T,
      policies: () => new Promise((resolve) => pending.push(resolve as (value: unknown) => void))
    })
  }
})
vi.mock('@/services/api', () => ({ session: { userId: () => null, invalidate: vi.fn() } }))
vi.mock('@/stores/account-store', () => ({ useAccountStore: () => ({ login: vi.fn() }) }))
vi.mock('@/services/navigation', () => ({ safeTarget: (value: string) => value }))
import LoginPrompt from '@/components/app-login-prompt/app-login-prompt.vue'
import { dismissLoginPrompt, promptLogin } from '@/services/login-prompt'
it('shares one formal policy read across cached page prompts without making the visible earlier page fail', async () => {
  const first = mount(LoginPrompt, {
      global: { stubs: { 'scroll-view': { template: '<view><slot /></view>' } } }
    }),
    second = mount(LoginPrompt, {
      global: { stubs: { 'scroll-view': { template: '<view><slot /></view>' } } }
    })
  promptLogin('/sub-packages/listening/article?id=article', 'full_audio')
  await flushPromises()
  pending.forEach((resolve) =>
    resolve({
      mode: 'published',
      server_now: '',
      documents: [
        { kind: 'terms', version: 't1', title: '协议', content: '正式全文' },
        { kind: 'privacy', version: 'p1', title: '隐私', content: '正式全文' }
      ]
    })
  )
  await flushPromises()
  expect(first.text()).toContain('登录后可播放全文音频')
  expect(second.text()).toContain('登录后可播放全文音频')
  expect(first.text()).not.toContain('协议状态已更新')
  expect(pending).toHaveLength(1)
  dismissLoginPrompt()
  await flushPromises()
  promptLogin('/sub-packages/listening/article?id=another', 'full_audio')
  await flushPromises()
  expect(pending).toHaveLength(2)
  pending[1]!({
    mode: 'published',
    server_now: '',
    documents: [
      { kind: 'terms', version: 't2', title: '协议', content: '新正式全文' },
      { kind: 'privacy', version: 'p2', title: '隐私', content: '新正式全文' }
    ]
  })
  await flushPromises()
  expect(first.text()).toContain('登录后可播放全文音频')
  dismissLoginPrompt()
  first.unmount()
  second.unmount()
})
