import { expect, it } from 'vitest'

import { operationAnalytics } from '@/services/analytics-operations'
import { createOperationService } from '@/services/operation-service'

it.each([
  ['/api/mini/v1/cards/c1/complete', 'POST', 'learning_complete', 'scene', undefined],
  [
    '/api/mini/v1/listening/articles/a1/complete',
    'POST',
    'learning_complete',
    'listening',
    undefined
  ],
  ['/api/mini/v1/cards/c1/favorite', 'PUT', 'favorite_change', 'scene', 1],
  ['/api/mini/v1/favorites/c1', 'DELETE', 'favorite_change', 'scene', 0],
  ['/api/mini/v1/listening/favorites/a1', 'DELETE', 'favorite_change', 'listening', 0]
])(
  'maps confirmed %s to the correct non-sensitive business event',
  (path, method, event, type, favorite) => {
    const mapped = operationAnalytics({
      path,
      method,
      key: 'private-operation',
      action: 'action',
      frozenRequest: '{"body":{"phone":"private"}}'
    })
    expect(mapped).toEqual({
      event,
      properties: {
        content_type: type,
        content_id: type === 'scene' ? 'c1' : 'a1',
        ...(favorite === undefined ? {} : { favorite })
      }
    })
  }
)
it.each([
  ['/api/mini/v1/me/profile', 'PATCH', 'profile_save'],
  ['/api/mini/v1/feedback', 'POST', 'feedback_submit'],
  ['/api/mini/v1/feedback/private-feedback/messages', 'POST', 'feedback_reply']
])('records only the confirmed operation kind for %s', (path, method, event) => {
  expect(
    operationAnalytics({
      path,
      method,
      action: 'profile',
      key: 'private-key',
      frozenRequest: '{"phone":"private","text":"private"}'
    })
  ).toEqual({ event, properties: {} })
})
it('ignores image uploads, private read receipts, wrong methods and progress payloads', () => {
  for (const path of [
    '/api/mini/v1/feedback/images',
    '/api/mini/v1/feedback/private-id/read',
    '/api/mini/v1/me/profile'
  ])
    expect(operationAnalytics({ path, method: 'PUT', action: 'anything', key: 'k' })).toBeNull()
  expect(
    operationAnalytics({
      path: '/api/mini/v1/listening/articles/a1/progress',
      method: 'PUT',
      action: 'progress',
      key: 'k'
    })
  ).toBeNull()
})
it('notifies confirmed operations for a recovery once and isolates observer errors from business success', async () => {
  const saved = new Map<string, unknown>(),
    events: string[] = []
  let fail = true
  const operations = createOperationService({
    session: {
      userId: () => 'fixture-user',
      request: async <T>() => {
        if (fail) throw new Error('network')
        return { status: 'succeeded', result: { completed: true } } as T
      }
    },
    storage: {
      get: (key) => saved.get(key),
      set: (key, value) => {
        saved.set(key, value)
      },
      remove: (key) => {
        saved.delete(key)
      }
    },
    key: () => 'fixture-operation',
    onConfirmed: (record) => {
      events.push(record.key)
      throw new Error('analytics unavailable')
    }
  })
  await expect(
    operations.run('complete:c1', '/api/mini/v1/cards/c1/complete', 'POST')
  ).rejects.toThrow('network')
  expect(events).toEqual([])
  fail = false
  expect(await operations.recover('complete:c1')).toEqual({ completed: true })
  expect(await operations.recover('complete:c1')).toBeNull()
  expect(events).toEqual(['fixture-operation'])
})

it('does not map retired contact receipts to analytics', () => {
  expect(
    operationAnalytics({
      path: '/api/mini/v1/me/contact',
      method: 'PATCH',
      action: 'contact-save',
      key: 'retired-key'
    })
  ).toBeNull()
})
