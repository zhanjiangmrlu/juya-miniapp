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
      get: (k) => saved.get(k) ?? '',
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
it.each([true, false])(
  'saves a first statistics choice %s with the native empty-string cache',
  async (enabled) => {
    const { service } = setup()
    await service.loadPolicies()
    await service.restore('first-choice-account')
    await service.choose(enabled)
    expect(service.state.value?.analytics).toMatchObject({ enabled, revision: 2 })
    expect(service.isBlocked()).toBe(false)
  }
)
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
      return {
        agreements: {
          current: true,
          accepted: { terms: { version: 't1' }, privacy: { version: 'p1' } }
        },
        analytics: a
      } as T
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

it('uses the known account confirmation instead of another local agreement record', async () => {
  const { service } = setup()
  await service.loadPolicies()
  service.confirm('first_launch')
  await service.restore('different-account')
  expect(service.confirmed()).toBe(false)
  expect(service.shouldNotify()).toBe(true)
})

it('requires confirmation again when a necessary policy changes after account restoration', async () => {
  const { service } = setup()
  await service.loadPolicies()
  await service.restore('known-account')
  service.state.value = {
    agreements: {
      current: true,
      accepted: { terms: { version: 't1' }, privacy: { version: 'p1' } }
    },
    analytics: {
      enabled: true,
      scope_version: 'a1',
      revision: 1,
      updated_at: null,
      collecting: null
    }
  }
  expect(service.confirmed()).toBe(true)
  service.policies.value = {
    ...published,
    documents: published.documents.map((document) =>
      document.kind === 'privacy' ? { ...document, version: 'p2' } : document
    )
  }
  expect(service.confirmed()).toBe(false)
})

it('ignores an enabled snapshot read during a withdrawal that completes first', async () => {
  let finishRead!: (value: unknown) => void,
    finishWrite!: (value: unknown) => void,
    reads = 0
  const saved = new Map<string, unknown>()
  const enabled = {
    enabled: true,
    scope_version: 'a1',
    revision: 1,
    updated_at: null,
    collecting: null
  }
  const snapshot = { agreements: { current: true }, analytics: enabled }
  const service = createPrivacyService({
    storage: {
      get: (key) => saved.get(key),
      set: (key, value) => {
        saved.set(key, value)
      },
      remove: (key) => {
        saved.delete(key)
      }
    },
    key: () => 'withdrawal-key',
    policies: async () => published,
    request: async <T>(path: string) => {
      if (path.endsWith('analytics-preference'))
        return new Promise<T>((resolve) => {
          finishWrite = (value) => resolve(value as T)
        })
      if (reads++)
        return new Promise<T>((resolve) => {
          finishRead = (value) => resolve(value as T)
        })
      return snapshot as T
    }
  })
  await service.loadPolicies()
  await service.restore('u')
  const withdrawal = service.choose(false)
  const staleRead = service.restore('u')
  finishWrite({ ...enabled, enabled: false, revision: 2, collecting: false })
  await withdrawal
  expect(service.isBlocked()).toBe(false)
  finishRead(snapshot)
  await staleRead
  expect(service.state.value?.analytics).toMatchObject({ enabled: false, revision: 2 })
})

it('does not let an older catalog reopen a capability closed by a newer catalog', async () => {
  const { service } = setup()
  let finishOld!: (value: PolicyBundle) => void,
    calls = 0
  const guarded = createPrivacyService({
    storage: { get: () => undefined, set: () => undefined, remove: () => undefined },
    key: () => 'key',
    request: async <T>() => service.state.value as T,
    policies: async () => {
      if (calls++) return { ...published, analytics_available: false }
      return new Promise<PolicyBundle>((resolve) => {
        finishOld = resolve
      })
    }
  })
  const old = guarded.loadPolicies()
  await guarded.loadPolicies()
  finishOld({ ...published, analytics_available: true })
  await expect(old).rejects.toThrow('协议状态已更新')
  expect(guarded.policies.value.analytics_available).toBe(false)
})

it('treats WeChat empty-string storage as no confirmation or prior disclosure day', async () => {
  const values = new Map<string, unknown>()
  const service = createPrivacyService({
    storage: {
      get: (key) => values.get(key) ?? '',
      set: (key, value) => {
        values.set(key, value)
      },
      remove: (key) => {
        values.delete(key)
      }
    },
    key: () => 'wechat-confirmation',
    policies: async () => published,
    request: async <T>() => ({}) as T,
    now: () => Date.parse('2026-11-11T00:00:00Z')
  })
  await service.loadPolicies()
  expect(service.confirmation()).toBeUndefined()
  expect(service.confirmed()).toBe(false)
  expect(service.shouldNotify()).toBe(true)
  service.markShown()
  expect(service.shouldNotify()).toBe(false)
})
