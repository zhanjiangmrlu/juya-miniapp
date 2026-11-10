import { expect, it } from 'vitest'

import { createPrivacyService } from '@/services/privacy-service'

import type { PolicyBundle } from '@/shared/types/privacy'
const published: PolicyBundle = {
  mode: 'published',
  server_now: '2026-11-10T12:00:00Z',
  documents: [
    { kind: 'terms', version: 't1', title: '协议', content: '正文' },
    { kind: 'privacy', version: 'p1', title: '隐私', content: '正文' },
    { kind: 'analytics', version: 'a1', title: '统计', content: '正文' }
  ]
}
const setup = () => {
  const saved = new Map<string, unknown>()
  let failed = false
  const service = createPrivacyService({
    storage: {
      get: (k) => saved.get(k),
      set: (k, v) => {
        saved.set(k, v)
      },
      remove: (k) => {
        saved.delete(k)
      }
    },
    key: () => 'confirmation-0001',
    now: () => Date.parse('2026-11-10T16:00:00Z'),
    policies: async () => published,
    request: async <T>(_path: string, options?: { body?: unknown }) => {
      if (failed) throw new Error('offline')
      const analytics = {
        enabled: (options?.body as { enabled?: boolean })?.enabled ?? true,
        scope_version: 'a1',
        revision: 2,
        updated_at: '',
        collecting: false
      }
      return (
        _path.endsWith('analytics-preference') ? analytics : { agreements: [], analytics }
      ) as T
    }
  })
  return {
    service,
    saved,
    fail: () => {
      failed = true
    }
  }
}
it('records automatic display only once per Beijing day, never treats dismiss as agreement', async () => {
  const { service } = setup()
  await service.loadPolicies()
  expect(service.shouldNotify()).toBe(true)
  service.markShown()
  expect(service.shouldNotify()).toBe(false)
  expect(service.confirmed()).toBe(false)
})
it('keeps explicit agreement across failed login without inheriting analytics permission', async () => {
  const { service } = setup()
  await service.loadPolicies()
  const c = service.confirm('first_launch')
  expect(c.terms_version).toBe('t1')
  expect(service.confirmed()).toBe(true)
  expect(service.shouldNotify()).toBe(false)
  expect(service.state.value?.analytics.enabled).toBeUndefined()
})
it('keeps local withdrawal across failed sync and stale server enabled response', async () => {
  const { service, fail } = setup()
  await service.loadPolicies()
  await service.restore('user-a')
  fail()
  await expect(service.choose(false)).rejects.toThrow('offline')
  expect(service.isBlocked()).toBe(true)
  expect(service.state.value?.analytics.enabled).toBe(false)
  service.reset()
  expect(service.state.value).toBeNull()
  await expect(service.restore('user-a')).rejects.toThrow()
  expect(service.isBlocked()).toBe(true)
})
it('legacy mode never creates a new agreement or automatic notification', async () => {
  const { service } = setup()
  service.policies.value = { mode: 'legacy', server_now: '', documents: [] }
  expect(service.shouldNotify()).toBe(false)
  expect(() => service.confirm('first_launch')).toThrow()
})
it('does not overwrite a completed withdrawal with an older same-account restore', async () => {
  let finish!: (v: unknown) => void
  let reads = 0
  const saved = new Map<string, unknown>()
  const a = { enabled: true, scope_version: 'a1', revision: 1, updated_at: '', collecting: false }
  const service = createPrivacyService({
    storage: {
      get: (k) => saved.get(k),
      set: (k, v) => {
        saved.set(k, v)
      },
      remove: (k) => {
        saved.delete(k)
      }
    },
    key: () => 'k',
    policies: async () => published,
    request: async <T>(path: string) => {
      if (path.endsWith('analytics-preference')) return { ...a, enabled: false, revision: 2 } as T
      if (reads++)
        return new Promise((r) => {
          finish = (value) => r(value as T)
        }) as Promise<T>
      return { agreements: { current: true }, analytics: a } as T
    }
  })
  await service.loadPolicies()
  await service.restore('u')
  const old = service.restore('u')
  await service.choose(false)
  finish({ agreements: { current: true }, analytics: a })
  await old
  expect(service.state.value?.analytics.enabled).toBe(false)
  expect(service.confirmed()).toBe(true)
})
it('replays the original preference key and revision after a lost success response', async () => {
  const saved = new Map<string, unknown>(),
    calls: unknown[] = []
  let count = 0,
    key = 0
  const a = { enabled: false, scope_version: 'a1', revision: 2, updated_at: '', collecting: false }
  const service = createPrivacyService({
    storage: {
      get: (k) => saved.get(k),
      set: (k, v) => {
        saved.set(k, v)
      },
      remove: (k) => {
        saved.delete(k)
      }
    },
    key: () => `key-${++key}`,
    policies: async () => published,
    request: async <T>(
      path: string,
      options?: { method?: string; body?: unknown; key?: string }
    ) => {
      if (path.endsWith('analytics-preference')) {
        calls.push(options)
        if (count++ === 0) throw new Error('offline')
        return a as T
      }
      return { agreements: {}, analytics: { ...a, enabled: true, revision: 1 } } as T
    }
  })
  await service.loadPolicies()
  await service.restore('u')
  await expect(service.choose(false)).rejects.toThrow()
  await service.choose(false)
  expect(calls[0]).toEqual(calls[1])
  expect(service.isBlocked()).toBe(false)
})
