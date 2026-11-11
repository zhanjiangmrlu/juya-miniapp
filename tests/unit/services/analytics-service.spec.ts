import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { analyticsFixture } from './analytics-sdk-fixture'

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
})

it('uses the current safe page when page entry has no explicit route', async () => {
  const f = analyticsFixture()
  f.service.foreground()
  f.update({ owner: 'business-a', enabled: true, policiesReady: true, revision: 1 })
  await f.service.track('page_enter')
  expect(f.authorized[0]?.properties.page_path).toBe('pages/home/index')
})
it('stops immediately on trusted revision, policy or owner loss even without a sync call', async () => {
  const f = analyticsFixture()
  f.service.foreground()
  f.update({ owner: 'business-a', enabled: true, policiesReady: true, revision: 1 })
  const context = f.context()
  context.owner = null
  const before = f.calls.length
  vi.advanceTimersByTime(60000)
  expect(f.calls).toHaveLength(before)
  expect(f.service.hasConsent()).toBe(false)
  expect(f.service.running).toBe(false)
})
it('deduplicates one confirmed receipt within a permission and resets on a new revision', async () => {
  const f = analyticsFixture()
  f.service.foreground()
  f.update({ owner: 'business-a', enabled: true, policiesReady: true, revision: 1 })
  await f.service.track('favorite_change', { content_id: 'card-1', favorite: 1 }, 'receipt-1')
  await f.service.track('favorite_change', { content_id: 'card-1', favorite: 1 }, 'receipt-1')
  expect(f.authorized).toHaveLength(1)
  f.update({ revision: 2 })
  await f.service.track('favorite_change', { content_id: 'card-1', favorite: 0 }, 'receipt-1')
  expect(f.authorized.map((event) => event.consent_revision)).toEqual([1, 2])
})
it('does not accept old boolean setters as login or independent consent', async () => {
  const f = analyticsFixture()
  f.service.setAuthenticated(true)
  f.service.setConsent(true)
  f.service.foreground()
  await f.service.track('content_open', { content_id: 'unauthenticated' })
  expect(f.instances()).toBe(0)
  expect(f.calls).toEqual([])
})

it('does not deliver a cleared foreground event when server confirmation returns after a background round trip', async () => {
  let finish!: () => void
  const f = analyticsFixture({
    authorize: () =>
      new Promise<void>((resolve) => {
        finish = resolve
      })
  })
  f.service.foreground()
  f.update({ owner: 'business-a', enabled: true, policiesReady: true, revision: 1 })
  const pending = f.service.track('content_open', { content_id: 'prior-foreground' })
  f.service.background()
  f.service.foreground()
  finish()
  await pending
  f.service.background()
  expect(f.events()).toEqual([])
})
