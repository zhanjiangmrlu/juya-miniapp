import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { analyticsFixture } from './analytics-sdk-fixture'

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
})

it.each([
  { owner: null, enabled: true, policiesReady: true },
  { owner: 'business-a', enabled: false, policiesReady: true },
  { owner: 'business-a', enabled: true, policiesReady: false }
])('keeps the real SDK absent when a trusted prerequisite is missing: %o', async (context) => {
  const f = analyticsFixture()
  f.update({ ...context, revision: 1 })
  f.service.foreground()
  await f.service.track('content_open', { content_id: 'before-consent' })
  vi.advanceTimersByTime(60000)
  expect(f.instances()).toBe(0)
  expect(f.calls).toEqual([])
  expect(f.authorized).toEqual([])
  expect(f.service.running).toBe(false)
})

it('authorizes exactly five manual event types before real SDK delivery and excludes private input', async () => {
  const f = analyticsFixture()
  f.service.foreground({ scene: 1001, query: { token: 'fixture-login-token' } })
  f.update({ owner: 'business-a', enabled: true, policiesReady: true, revision: 2 })
  for (const event of [
    'page_enter',
    'content_open',
    'audio_play',
    'favorite_change',
    'learning_complete'
  ]) {
    await f.service.track(event, {
      page_path: 'pages/home/index?token=fixture-login-token',
      content_id: 'card-1',
      token: 'fixture-login-token',
      openid: 'fixture-openid',
      phone: 'fixture-phone'
    } as never)
    vi.advanceTimersByTime(16000)
  }
  await f.service.track('dictionary_lookup', { content_id: 'forbidden' })
  f.service.background()
  expect(f.service.running).toBe(true)
  expect(f.authorized.map((event) => event.event)).toEqual([
    'page_enter',
    'content_open',
    'audio_play',
    'favorite_change',
    'learning_complete'
  ])
  expect(
    f.authorized.every((event) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(event.event_id)
    )
  ).toBe(true)
  expect(f.events().map((event) => event.id)).toEqual([
    'page_enter',
    'content_open',
    'audio_play',
    'favorite_change',
    'learning_complete'
  ])
  const payload = JSON.stringify(f.requests)
  expect(payload).toContain('business-a')
  expect(payload).toContain('fixture-model')
  for (const forbidden of [
    'fixture-login-token',
    'fixture-openid',
    'fixture-phone',
    'forbidden',
    '"od":',
    '"und":'
  ])
    expect(payload).not.toContain(forbidden)
  expect(f.authorized[0]?.properties.page_path).toBe('pages/home/index')
  expect(f.events()[0]).toMatchObject({
    event_id: f.authorized[0]?.event_id,
    consent_revision: 2,
    occurred_at: f.authorized[0]?.occurred_at
  })
})

it('drops an event whose server authorization completes after withdrawal', async () => {
  let finish!: () => void
  const f = analyticsFixture({
    authorize: () =>
      new Promise<void>((resolve) => {
        finish = resolve
      })
  })
  f.service.foreground()
  f.update({ owner: 'business-a', enabled: true, policiesReady: true, revision: 1 })
  const pending = f.service.track('learning_complete', { content_id: 'stale-event' })
  f.update({ enabled: false, revision: 2 })
  const count = f.calls.length
  finish()
  await pending
  vi.advanceTimersByTime(60000)
  expect(f.calls).toHaveLength(count)
  expect(f.events()).toEqual([])
  expect(f.service.running).toBe(false)
  expect(f.requests.every((request) => request.abort)).toBe(true)
})

it('discards delayed initialization and creates a new empty SDK after reconsent or account switch', async () => {
  const f = analyticsFixture({ delayed: true, offline: true })
  f.service.foreground()
  f.update({ owner: 'business-a', enabled: true, policiesReady: true, revision: 1 })
  const staleCallbacks = f.callbacks.splice(0)
  f.update({ enabled: false, revision: 2 })
  const count = f.calls.length
  staleCallbacks.forEach((callback) => callback())
  vi.advanceTimersByTime(60000)
  expect(f.calls).toHaveLength(count)
  f.update({ owner: 'business-b', enabled: true, revision: 3 })
  f.callbacks.splice(0).forEach((callback) => callback())
  await f.service.track('content_open', { content_id: 'new-account-only' })
  f.service.background()
  const newRequests = f.requests.slice(0)
  expect(f.instances()).toBe(2)
  expect(JSON.stringify(newRequests)).toContain('business-b')
  expect(JSON.stringify(newRequests)).not.toContain('business-a')
})

it('never replays the previous account offline queue or reuses its UUID', async () => {
  const f = analyticsFixture({ offline: true })
  f.service.foreground()
  f.update({ owner: 'business-a', enabled: true, policiesReady: true, revision: 1 })
  await f.service.track('content_open', { content_id: 'old-account-content' })
  f.service.background()
  const before = f.requests.length
  const oldUuid = (f.requests[0]?.data.h as { itr?: { ud?: string } })?.itr?.ud
  f.update({ owner: 'business-b', revision: 2 })
  f.service.foreground()
  await f.service.track('content_open', { content_id: 'new-account-content' })
  f.service.background()
  const next = f.requests.slice(before)
  expect(JSON.stringify(next)).toContain('business-b')
  expect(JSON.stringify(next)).not.toContain('business-a')
  expect(JSON.stringify(next)).not.toContain('old-account-content')
  expect((next[0]?.data.h as { itr?: { ud?: string } })?.itr?.ud).not.toBe(oldUuid)
  expect(f.instances()).toBe(2)
})

it('blocks backend-rejected events and keeps production uninitialized', async () => {
  const f = analyticsFixture({
    authorize: async () => {
      throw new Error('permission denied')
    }
  })
  f.service.foreground()
  f.update({ owner: 'business-a', enabled: true, policiesReady: true, revision: 1 })
  await f.service.track('audio_play', { content_id: 'server-rejected' })
  f.service.background()
  expect(f.events()).toEqual([])
  expect(f.service.running).toBe(false)
  const production = analyticsFixture({ production: true })
  production.service.foreground()
  production.update({ owner: 'business-a', enabled: true, policiesReady: true, revision: 1 })
  expect(production.instances()).toBe(0)
  expect(production.calls).toEqual([])
})
