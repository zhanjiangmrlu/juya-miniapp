import { expect, it, vi } from 'vitest'

import { ApiError } from '@/services/errors'
import { createOperationService } from '@/services/operation-service'

const setup = () => {
  const records = new Map<string, unknown>(),
    request = vi.fn()
  let key = 0
  const storage = {
    get: (name: string) => records.get(name),
    set: (name: string, value: unknown) => {
      records.set(name, value)
    },
    remove: (name: string) => {
      records.delete(name)
    }
  }
  return {
    records,
    request,
    operations: createOperationService({
      session: { userId: () => 'user-1', request },
      storage,
      key: () => `write-key-${++key}`
    })
  }
}
it('retries a completion after midnight with the original key and does not infer a new date', async () => {
  const { request, operations } = setup()
  request
    .mockRejectedValueOnce(new ApiError('network_unknown', '响应未知'))
    .mockResolvedValueOnce({ date: '2026-10-17', first_completion: true })
  const args = [
    'complete:card-1',
    '/api/mini/v1/cards/card-1/complete',
    'POST',
    { version_id: 'version-1' }
  ] as const
  await expect(operations.run(...args)).rejects.toMatchObject({ code: 'network_unknown' })
  expect(await operations.run(...args)).toEqual({ date: '2026-10-17', first_completion: true })
  expect(request.mock.calls[0]?.[1].key).toBe(request.mock.calls[1]?.[1].key)
})
it('persists result-query metadata without copying contact fields into storage', async () => {
  const { request, operations, records } = setup()
  request.mockRejectedValueOnce(new ApiError('network_unknown', '响应未知'))
  await expect(
    operations.run('contact', '/api/mini/v1/me/contact', 'PATCH', {
      phone: '13800138000',
      wechat_contact: 'Learner_private',
      version: 1
    })
  ).rejects.toBeInstanceOf(ApiError)
  const serialized = JSON.stringify(Array.from(records.values()))
  expect(serialized).not.toContain('13800138000')
  expect(serialized).not.toContain('Learner_private')
  request.mockResolvedValueOnce({ status: 'succeeded', result: { contact_version: 2 } })
  expect(await operations.recover('contact')).toEqual({ contact_version: 2 })
  expect(request.mock.calls[1]?.[0]).toMatch(/\/operations\/write-key-1$/)
})
it('keeps separate concurrent card operations and rejects editing an unresolved request', async () => {
  const { request, operations } = setup()
  request.mockRejectedValue(new ApiError('network_unknown', '响应未知'))
  await expect(
    operations.run('complete:a', '/api/mini/v1/cards/a/complete', 'POST', { version_id: 'v1' })
  ).rejects.toBeInstanceOf(ApiError)
  await expect(
    operations.run('complete:b', '/api/mini/v1/cards/b/complete', 'POST', { version_id: 'v1' })
  ).rejects.toBeInstanceOf(ApiError)
  expect(request.mock.calls[0]?.[1].key).not.toBe(request.mock.calls[1]?.[1].key)
  await expect(
    operations.run('complete:a', '/api/mini/v1/cards/a/complete', 'POST', { version_id: 'v2' })
  ).rejects.toMatchObject({ code: 'operation_pending' })
  expect(request).toHaveBeenCalledTimes(2)
})

it('never applies an old account response or clears another account pending operation', async () => {
  let owner = 'user-1',
    finish!: (response: unknown) => void,
    key = 0
  const records = new Map<string, unknown>()
  const request = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    .mockRejectedValue(new ApiError('network_unknown', '响应未知'))
  const operations = createOperationService({
    session: { userId: () => owner, request },
    storage: {
      get: (name) => records.get(name),
      set: (name, value) => {
        records.set(name, value)
      },
      remove: (name) => {
        records.delete(name)
      }
    },
    key: () => `key-${++key}`
  })
  const previous = operations.run('contact', '/api/mini/v1/me/contact', 'PATCH', {
    phone: '13800138000'
  })
  owner = 'user-2'
  await expect(
    operations.run('contact', '/api/mini/v1/me/contact', 'PATCH', { phone: '13900139000' })
  ).rejects.toBeInstanceOf(ApiError)
  finish({ contact_version: 2 })
  await expect(previous).rejects.toMatchObject({ code: 'session_changed' })
  expect(operations.pending('contact')).toBe(true)
})

it('keeps the original write key when a gateway returns a server error after an unknown commit', async () => {
  const { request, operations } = setup()
  request
    .mockRejectedValueOnce(new ApiError('internal_error', '结果暂未确认', 503))
    .mockResolvedValueOnce({ date: '2026-10-17' })
  await expect(
    operations.run('complete:a', '/api/mini/v1/cards/a/complete', 'POST', { version_id: 'v1' })
  ).rejects.toBeInstanceOf(ApiError)
  await operations.run('complete:a', '/api/mini/v1/cards/a/complete', 'POST', { version_id: 'v1' })
  expect(request.mock.calls[0]?.[1].key).toBe(request.mock.calls[1]?.[1].key)
})
