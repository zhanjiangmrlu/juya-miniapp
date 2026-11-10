import { expect, it } from 'vitest'

import { createAnalyticsEvents } from '@/services/analytics-events'
it('drops events before consent and rejects retired event names', async () => {
  const sent: unknown[] = []
  let enabled = false
  const e = createAnalyticsEvents({
    context: () => ({ owner: 'u', revision: 1, enabled }),
    send: async (v) => {
      sent.push(v)
    },
    key: () => 'e1'
  })
  await e.track('audio_play', {})
  enabled = true
  await e.track('dictionary_lookup', {})
  await e.track('audio_play', { content_id: 'card' })
  expect(sent).toHaveLength(1)
})
it('does not deliver a queued event after owner or consent revision changes', async () => {
  const sent: unknown[] = []
  let owner = 'a'
  const e = createAnalyticsEvents({
    context: () => ({ owner, revision: 1, enabled: true }),
    send: async (v) => {
      sent.push(v)
    },
    key: () => 'e1'
  })
  e.capture('content_open', { content_id: 'card' })
  owner = 'b'
  await e.flush()
  expect(sent).toEqual([])
})
it('reuses the same event identifier for retry and never replays a withdrawn event', async () => {
  let enabled = true,
    fail = true
  const ids: string[] = []
  const e = createAnalyticsEvents({
    context: () => ({ owner: 'a', revision: 1, enabled }),
    send: async (v) => {
      ids.push(v.event_id)
      if (fail) throw new Error('offline')
    },
    key: () => 'e1'
  })
  await e.track('page_enter', {})
  fail = false
  await e.flush()
  expect(ids).toEqual(['e1', 'e1'])
  e.capture('audio_play', {})
  enabled = false
  await e.flush()
  enabled = true
  await e.flush()
  expect(ids).toHaveLength(2)
})
it('keeps new-permission queue entries when an old request finishes after clear', async () => {
  let finish!: () => void
  let revision = 1
  const ids: string[] = []
  let n = 0
  const e = createAnalyticsEvents({
    context: () => ({ owner: 'u', revision, enabled: true }),
    key: () => `e${++n}`,
    send: async (v) => {
      ids.push(v.event_id)
      if (v.event_id === 'e1')
        await new Promise<void>((r) => {
          finish = r
        })
    }
  })
  const old = e.track('page_enter', {})
  e.clear()
  revision = 2
  e.capture('content_open', {})
  finish()
  await old
  await e.flush()
  expect(ids).toEqual(['e1', 'e2'])
})

it('rejects input-like identifiers and unsafe enum values while preserving only safe route paths', async () => {
  const sent: unknown[] = []
  const events = createAnalyticsEvents({
    context: () => ({ owner: 'u', revision: 1, enabled: true }),
    key: () => 'e1',
    send: async (event) => {
      sent.push(event)
    }
  })
  await events.track('content_open', {
    page_path: 'pages/home/index?token=private-token',
    content_id: 'free text entered by user',
    content_type: 'private input',
    audio_kind: 'private input',
    favorite: 10,
    version_id: 'https://private.invalid/token'
  })
  expect(sent).toEqual([expect.objectContaining({ properties: { page_path: 'pages/home/index' } })])
})
