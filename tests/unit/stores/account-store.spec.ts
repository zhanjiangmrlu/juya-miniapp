import { beforeEach, expect, it, vi } from 'vitest'

const stored = new Map<string, unknown>()
const profile = (id: string) => ({
  id,
  nickname: id,
  avatar_id: null,
  phone: null,
  wechat_contact: null,
  profile_version: 1,
  contact_version: 1
})
beforeEach(() => {
  vi.resetModules()
  stored.clear()
  vi.stubGlobal('uni', {
    getStorageSync: (key: string) => stored.get(key),
    setStorageSync: (key: string, value: unknown) => stored.set(key, value),
    removeStorageSync: (key: string) => stored.delete(key),
    request: vi.fn(),
    navigateTo: vi.fn(),
    reLaunch: vi.fn(),
    switchTab: vi.fn()
  })
})
it('restores a guest without private API calls or automatic login navigation', async () => {
  const { createPinia, setActivePinia } = await import('pinia')
  setActivePinia(createPinia())
  const { useAccountStore } = await import('@/stores/account-store')
  const account = useAccountStore()
  expect(await account.restore()).toBeNull()
  expect(account.profile).toBeNull()
  expect(uni.request).not.toHaveBeenCalled()
  expect(uni.navigateTo).not.toHaveBeenCalled()
  expect(uni.reLaunch).not.toHaveBeenCalled()
})
it('expires into guest content and clears personal fields without forcing the login screen', async () => {
  stored.set('juya-rebuild-mini-session-v1', { user_id: 'A', access_token: 'mini_A' })
  const { createPinia, setActivePinia } = await import('pinia')
  setActivePinia(createPinia())
  const { useAccountStore } = await import('@/stores/account-store')
  const { session } = await import('@/services/api')
  const account = useAccountStore()
  vi.mocked(uni.request).mockImplementationOnce((options) => {
    options.success?.({ statusCode: 200, data: profile('A') } as never)
    return {} as never
  })
  await account.restore()
  expect(account.profile?.id).toBe('A')
  vi.mocked(uni.request)
    .mockImplementationOnce((options) => {
      options.success?.({ statusCode: 401, data: { error: { code: 'unauthenticated' } } } as never)
      return {} as never
    })
    .mockImplementationOnce((options) => {
      options.success?.({ statusCode: 200, data: { items: [], total: 0 } } as never)
      return {} as never
    })
  await expect(session.contentRequest('/api/mini/v1/cards')).resolves.toMatchObject({ total: 0 })
  expect(account.profile).toBeNull()
  expect(account.statistics).toBeNull()
  expect(account.avatarURL).toBe('')
  expect(uni.navigateTo).not.toHaveBeenCalled()
  expect(uni.reLaunch).not.toHaveBeenCalled()
})
it('rejects the late A profile while B is restoring after an intervening guest epoch', async () => {
  stored.set('juya-rebuild-mini-session-v1', { user_id: 'A', access_token: 'mini_A' })
  const { createPinia, setActivePinia } = await import('pinia')
  setActivePinia(createPinia())
  const { useAccountStore } = await import('@/stores/account-store')
  const { session } = await import('@/services/api')
  const account = useAccountStore()
  let finish!: UniApp.RequestOptions['success']
  vi.mocked(uni.request).mockImplementationOnce((options) => {
    finish = options.success
    return {} as never
  })
  const a = account.restore()
  session.invalidate()
  stored.set('juya-rebuild-mini-session-v1', { user_id: 'B', access_token: 'mini_B' })
  vi.mocked(uni.request).mockImplementationOnce((options) => {
    options.success?.({ statusCode: 200, data: profile('B') } as never)
    return {} as never
  })
  await account.restore()
  finish?.({ statusCode: 200, data: profile('A') } as never)
  await expect(a).rejects.toMatchObject({ code: 'session_changed' })
  expect(account.profile?.id).toBe('B')
})

it('does not clear a newer pending restoration when the previous identity response settles', async () => {
  stored.set('juya-rebuild-mini-session-v1', { user_id: 'A', access_token: 'mini_A' })
  const { createPinia, setActivePinia } = await import('pinia')
  setActivePinia(createPinia())
  const { useAccountStore } = await import('@/stores/account-store')
  const { session } = await import('@/services/api')
  const account = useAccountStore()
  const finishes: NonNullable<UniApp.RequestOptions['success']>[] = []
  vi.mocked(uni.request).mockImplementation((options) => {
    if (options.success) finishes.push(options.success)
    return {} as never
  })
  const a = account.restore()
  session.invalidate()
  stored.set('juya-rebuild-mini-session-v1', { user_id: 'B', access_token: 'mini_B' })
  const b = account.restore()
  finishes[0]({ statusCode: 200, data: profile('A') } as never)
  await expect(a).rejects.toMatchObject({ code: 'session_changed' })
  const bAgain = account.restore()
  expect(uni.request).toHaveBeenCalledTimes(2)
  finishes[1]({ statusCode: 200, data: profile('B') } as never)
  await Promise.all([b, bAgain])
  expect(account.profile?.id).toBe('B')
})
