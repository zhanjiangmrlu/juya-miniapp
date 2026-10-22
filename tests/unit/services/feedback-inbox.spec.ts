import { expect, it, vi } from 'vitest'

import { createFeedbackInbox } from '@/services/feedback-inbox'

it('acknowledges only the rendered snapshot event and refreshes unread instead of clearing from its receipt', async () => {
  const request = vi.fn().mockResolvedValue({ unread: true, count: 2 })
  const run = vi.fn().mockResolvedValue({ feedback_id: 'f', read_event_id: 3 })
  const inbox = createFeedbackInbox({
    session: { userId: () => 'owner', request },
    operations: { run, pending: () => false, recover: vi.fn() }
  })
  await inbox.acknowledge(
    { id: 'f', unread: true, events: [{ id: 1 }, { id: 3 }], latest_event_id: 4 },
    () => true
  )
  expect(run.mock.calls[0]?.slice(1)).toEqual([
    '/api/mini/v1/feedback/f/read',
    'PUT',
    { event_id: 3 }
  ])
  expect(inbox.value.value).toEqual({ unread: true, count: 2 })
})
it('does not mark a failed render or leak a late unread response into another account', async () => {
  let owner: string | null = 'owner',
    finish!: (value: unknown) => void
  const run = vi.fn(),
    request = vi.fn(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
  const inbox = createFeedbackInbox({
    session: { userId: () => owner, request: request as never },
    operations: { run, pending: () => false, recover: vi.fn() }
  })
  await inbox.acknowledge(
    { id: 'f', unread: true, events: [{ id: 1 }], latest_event_id: 1 },
    () => false
  )
  expect(run).not.toHaveBeenCalled()
  const pending = inbox.refresh()
  owner = 'other'
  finish({ unread: true, count: 1 })
  await pending
  expect(inbox.value.value.unread).toBe(false)
})

it.each(['found', 'missing', 'failed'])(
  'queries the original unknown read receipt before retrying the same watermark (%s)',
  async (lookup) => {
    const { createOperationService } = await import('@/services/operation-service')
    const { ApiError } = await import('@/services/errors')
    const rows = new Map<string, unknown>(),
      request = vi.fn(),
      session = { userId: () => 'owner', request }
    const operations = createOperationService({
      session,
      key: () => 'read-original-key',
      storage: {
        get: (key) => rows.get(key),
        set: (key, value) => {
          rows.set(key, value)
        },
        remove: (key) => {
          rows.delete(key)
        }
      }
    })
    const inbox = createFeedbackInbox({ session, operations }),
      snapshot = { id: 'feedback-1', unread: true, latest_event_id: 3, events: [{ id: 3 }] }
    request.mockRejectedValueOnce(new ApiError('network_unknown', '读取结果未知'))
    await expect(inbox.acknowledge(snapshot, () => true)).rejects.toMatchObject({
      code: 'network_unknown'
    })
    if (lookup === 'found')
      request
        .mockResolvedValueOnce({
          status: 'succeeded',
          result: { feedback_id: 'feedback-1', read_event_id: 3 }
        })
        .mockResolvedValueOnce({ unread: true, count: 1 })
    if (lookup === 'missing')
      request
        .mockRejectedValueOnce(new ApiError('operation_unknown', '尚无结果', 404))
        .mockResolvedValueOnce({ feedback_id: 'feedback-1', read_event_id: 3 })
        .mockResolvedValueOnce({ unread: true, count: 1 })
    if (lookup === 'failed')
      request.mockRejectedValueOnce(new ApiError('unavailable', '查询失败', 503))
    if (lookup === 'failed') {
      await expect(inbox.acknowledge(snapshot, () => true)).rejects.toMatchObject({
        code: 'unavailable'
      })
      expect(operations.pending('feedback:read:feedback-1:3')).toBe(true)
    } else {
      await inbox.acknowledge(snapshot, () => true)
      expect(inbox.value.value.unread).toBe(true)
    }
    expect(request.mock.calls[1]?.[0]).toBe('/api/mini/v1/operations/read-original-key')
    const writes = request.mock.calls.filter(([, options]) => options?.method === 'PUT')
    expect(writes).toHaveLength(lookup === 'missing' ? 2 : 1)
    if (lookup === 'missing') expect(writes[1]?.[1].key).toBe(writes[0]?.[1].key)
  }
)
