import { afterEach, expect, it, vi } from 'vitest'
import { effectScope, reactive, ref } from 'vue'

const ports = vi.hoisted(() => ({
  owner: 'learner-1' as string | null,
  privacyOwner: 'learner-1',
  expires: '2099-01-01T00:00:00Z',
  state: undefined as unknown,
  policies: undefined as unknown,
  restricted: undefined as unknown,
  context: undefined as
    undefined | (() => { owner: string | null; enabled: boolean; policiesReady: boolean }),
  last: undefined as unknown,
  authorize: undefined as undefined | ((event: { consent_revision: number }) => Promise<void>),
  request: vi.fn(),
  loadPolicies: vi.fn(),
  restore: vi.fn()
}))
vi.mock('@/services/api', () => ({
  session: {
    userId: () => ports.owner,
    expiresAt: () => ports.expires,
    identity: () => ports.owner,
    request: ports.request
  }
}))
vi.mock('@/services/privacy', () => ({
  privacy: {
    get state() {
      return ports.state
    },
    get policies() {
      return ports.policies
    },
    published: () => true,
    confirmed: () => true,
    version: () => 'v1',
    isBlocked: () => false,
    currentOwner: () => ports.privacyOwner,
    loadPolicies: ports.loadPolicies,
    restore: ports.restore
  }
}))
vi.mock('@/services/runtime-mode', () => ({
  runtimeMode: {
    get browseOnly() {
      return ports.restricted
    }
  }
}))
vi.mock('@/services/analytics', () => ({
  analytics: {
    configure: (value: { context: typeof ports.context; authorize: typeof ports.authorize }) => {
      ports.context = value.context
      ports.authorize = value.authorize
    },
    sync: () => {
      ports.last = ports.context?.()
    }
  }
}))
import { ApiError } from '@/services/errors'
import { configurePrivacyAnalytics } from '@/services/privacy-analytics'

const scopes: ReturnType<typeof effectScope>[] = []
afterEach(() => scopes.splice(0).forEach((scope) => scope.stop()))

it('closes the SDK gate synchronously on withdrawal, identity changes and browse-only mode', () => {
  const state = ref({ analytics: { enabled: true, revision: 1, scope_version: 'v1' } })
  ports.state = state
  ports.policies = ref({ analytics_available: true })
  ports.restricted = ref(false)
  ports.owner = 'learner-1'
  const account = reactive({ profile: { id: 'learner-1' } as { id: string } | null })
  const scope = effectScope()
  scopes.push(scope)
  scope.run(() => configurePrivacyAnalytics(account))
  expect(ports.last).toMatchObject({ owner: 'learner-1', enabled: true, policiesReady: true })
  ports.expires = '2000-01-01T00:00:00Z'
  expect(ports.context?.()).toMatchObject({ owner: null })
  ports.expires = '2099-01-01T00:00:00Z'
  state.value = { analytics: { enabled: false, revision: 1, scope_version: 'v1' } }
  expect(ports.last).toMatchObject({ enabled: false })
  state.value = { analytics: { enabled: true, revision: 2, scope_version: 'v1' } }
  account.profile = { id: 'other-account' }
  expect(ports.last).toMatchObject({ owner: null })
  account.profile = { id: 'learner-1' }
  ports.privacyOwner = 'previous-account'
  expect(ports.context?.()).toMatchObject({ owner: null })
  ports.privacyOwner = 'learner-1'
  ;(ports.restricted as ReturnType<typeof ref<boolean>>).value = true
  expect(ports.last).toMatchObject({ policiesReady: false })
})

it('keeps an authorization denial closed until both policy and account refresh finish', async () => {
  ports.owner = ports.privacyOwner = 'learner-1'
  ports.state = ref({ analytics: { enabled: true, revision: 1, scope_version: 'v1' } })
  ports.policies = ref({ analytics_available: true })
  ports.restricted = ref(false)
  let finishCatalog!: () => void
  ports.request.mockRejectedValue(new ApiError('analytics_unavailable', '关闭', 503))
  ports.loadPolicies.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finishCatalog = resolve
      })
  )
  ports.restore.mockImplementation(async () => {
    ;(ports.state as ReturnType<typeof ref>).value = {
      analytics: { enabled: true, revision: 1, scope_version: 'v1' }
    }
  })
  const scope = effectScope()
  scopes.push(scope)
  scope.run(() => configurePrivacyAnalytics(reactive({ profile: { id: 'learner-1' } })))
  await expect(ports.authorize?.({ consent_revision: 1 })).rejects.toThrow('关闭')
  await Promise.resolve()
  expect(ports.context?.()).toMatchObject({ policiesReady: false })
  finishCatalog()
  await vi.waitFor(() => expect(ports.restore).toHaveBeenCalled())
  await vi.waitFor(() =>
    expect(ports.context?.()).toMatchObject({ enabled: true, policiesReady: true })
  )
})

it('does not reopen after catalog recovery fails even if an enabled snapshot arrives', async () => {
  ports.owner = ports.privacyOwner = 'learner-1'
  ports.state = ref({ analytics: { enabled: true, revision: 1, scope_version: 'v1' } })
  ports.policies = ref({ analytics_available: true })
  ports.restricted = ref(false)
  ports.request.mockRejectedValue(new ApiError('analytics_unavailable', '关闭', 503))
  ports.loadPolicies.mockRejectedValue(new Error('offline'))
  const scope = effectScope()
  scopes.push(scope)
  scope.run(() => configurePrivacyAnalytics(reactive({ profile: { id: 'learner-1' } })))
  await expect(ports.authorize?.({ consent_revision: 1 })).rejects.toThrow('关闭')
  ;(ports.state as ReturnType<typeof ref>).value = {
    analytics: { enabled: true, revision: 1, scope_version: 'v1' }
  }
  expect(ports.context?.()).toMatchObject({ policiesReady: false })
})
