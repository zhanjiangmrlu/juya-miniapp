import { expect, it, vi } from 'vitest'

import { ApiError } from '@/services/errors'
import { createOperationService } from '@/services/operation-service'

const setup = () => {
  const records = new Map<string, unknown>(),
    request = vi.fn()
  let key = 0
  const storage = {
    get: (name: string) => structuredClone(records.get(name)),
    set: (name: string, value: unknown) => {
      records.set(name, structuredClone(value))
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
it('looks up an unknown feedback result without replaying its frozen private input until explicitly requested', async () => {
  const { request, operations } = setup()
  request.mockRejectedValueOnce(new ApiError('network_unknown', '响应未知'))
  await expect(
    operations.run('feedback:create', '/api/mini/v1/feedback', 'POST', { text: 'private' })
  ).rejects.toBeInstanceOf(ApiError)
  request.mockRejectedValueOnce(new ApiError('operation_unknown', '尚无结果', 404))
  await expect(operations.recover('feedback:create', { retry: false })).rejects.toMatchObject({
    code: 'operation_unknown'
  })
  expect(request).toHaveBeenCalledTimes(2)
  expect(operations.pending('feedback:create')).toBe(true)
})
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
  owner = 'user-1'
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

it('settles the original frozen completion after a result miss and a newer publication', async () => {
  const { request, operations } = setup()
  const body = { version_id: 'v1' }
  request.mockRejectedValueOnce(new ApiError('network_unknown', '响应未知'))
  await expect(
    operations.run('complete:a', '/api/mini/v1/cards/a/complete', 'POST', body)
  ).rejects.toBeInstanceOf(ApiError)
  body.version_id = 'v2'
  request
    .mockRejectedValueOnce(new ApiError('operation_unknown', '尚无结果', 404))
    .mockRejectedValueOnce(new ApiError('version_changed', '内容已更新', 409))
  await expect(operations.recover('complete:a')).rejects.toMatchObject({ code: 'version_changed' })
  expect(request.mock.calls[2]).toEqual([
    '/api/mini/v1/cards/a/complete',
    { method: 'POST', body: { version_id: 'v1' }, key: 'write-key-1' }
  ])
  expect(operations.pending('complete:a')).toBe(false)
  request.mockResolvedValueOnce({ date: '2026-10-18' })
  await operations.run('complete:a', '/api/mini/v1/cards/a/complete', 'POST', body)
  expect(request.mock.calls[3]?.[1].key).toBe('write-key-2')
})

it('replays only the previous contact input when result lookup misses and keeps it out of storage', async () => {
  const { request, operations, records } = setup()
  request.mockRejectedValueOnce(new ApiError('network_unknown', '响应未知'))
  await expect(
    operations.run('contact-save', '/api/mini/v1/me/contact', 'PATCH', {
      phone: '13800138000',
      version: 1
    })
  ).rejects.toBeInstanceOf(ApiError)
  request
    .mockRejectedValueOnce(new ApiError('operation_unknown', '尚无结果', 404))
    .mockResolvedValueOnce({ contact_version: 2, phone: '13800138000' })
  expect(await operations.recover('contact-save')).toEqual({
    contact_version: 2,
    phone: '13800138000'
  })
  expect(request.mock.calls[2]?.[1]).toMatchObject({
    body: { phone: '13800138000', version: 1 },
    key: 'write-key-1'
  })
  expect(JSON.stringify(Array.from(records.values()))).not.toContain('13800138000')
})

it('retains an in-flight write receipt key when another request expires its session before the write response arrives', async () => {
  const { request, operations, records } = setup()
  request.mockRejectedValueOnce(new ApiError('session_changed', '账号状态已变化，请重新登录'))
  await expect(
    operations.run('feedback:create', '/api/mini/v1/feedback', 'POST', { text: '原反馈' })
  ).rejects.toMatchObject({ code: 'session_changed' })
  expect(operations.pending('feedback:create')).toBe(true)
  request.mockResolvedValueOnce({ status: 'succeeded', result: { id: 'accepted-before-expiry' } })
  expect(await operations.recover('feedback:create', { retry: false })).toEqual({
    id: 'accepted-before-expiry'
  })
  expect(request.mock.calls[1]?.[0]).toMatch(/operations\/write-key-1$/)
  expect(JSON.stringify(Array.from(records.values()))).not.toContain('原反馈')
})

it('allows rebinding a lost input only after an exact-key receipt miss and never rotates that key on conflict', async () => {
  const { request, operations } = setup()
  request.mockRejectedValueOnce(new ApiError('network_unknown', '响应未知'))
  await expect(
    operations.run('feedback:create', '/api/mini/v1/feedback', 'POST', { text: 'original' })
  ).rejects.toBeInstanceOf(ApiError)
  await expect(operations.rebind('feedback:create', { text: 'replacement' })).rejects.toMatchObject(
    { code: 'operation_pending' }
  )
  request.mockRejectedValueOnce(new ApiError('operation_unknown', '尚无结果', 404))
  await expect(operations.recover('feedback:create', { retry: false })).rejects.toMatchObject({
    code: 'operation_unknown'
  })
  request.mockRejectedValueOnce(new ApiError('operation_conflict', '原请求已接受', 409))
  await expect(operations.rebind('feedback:create', { text: 'replacement' })).rejects.toMatchObject(
    { code: 'operation_conflict' }
  )
  expect(request.mock.calls[2]?.[1].key).toBe('write-key-1')
  expect(operations.pending('feedback:create')).toBe(true)
  await expect(operations.rebind('feedback:create', { text: 'third' })).rejects.toMatchObject({
    code: 'operation_pending'
  })
})

it('consumes a receipt miss before automatic frozen retry so another unknown response cannot authorize rebinding', async () => {
  const { request, operations } = setup()
  request.mockRejectedValueOnce(new ApiError('network_unknown', '响应未知'))
  await expect(
    operations.run('feedback:create', '/api/mini/v1/feedback', 'POST', { text: 'original' })
  ).rejects.toBeInstanceOf(ApiError)
  request
    .mockRejectedValueOnce(new ApiError('operation_unknown', '尚无结果', 404))
    .mockRejectedValueOnce(new ApiError('network_unknown', '原请求重试未知'))
  await expect(operations.recover('feedback:create')).rejects.toMatchObject({
    code: 'network_unknown'
  })
  await expect(operations.rebind('feedback:create', { text: 'replacement' })).rejects.toMatchObject(
    { code: 'operation_pending' }
  )
  expect(request).toHaveBeenCalledTimes(3)
})

it('keeps the original unknown key when a replacement body is rejected before its original receipt is confirmed', async () => {
  const { request, operations } = setup()
  request.mockRejectedValueOnce(new ApiError('network_unknown', '响应未知'))
  await expect(
    operations.run('feedback:create', '/api/mini/v1/feedback', 'POST', { text: 'original' })
  ).rejects.toBeInstanceOf(ApiError)
  request.mockRejectedValueOnce(new ApiError('operation_unknown', '尚无结果', 404))
  await expect(operations.recover('feedback:create', { retry: false })).rejects.toBeInstanceOf(
    ApiError
  )
  request.mockRejectedValueOnce(new ApiError('invalid_request', '重填正文不符合当前条件', 422))
  await expect(operations.rebind('feedback:create', { text: 'replacement' })).rejects.toMatchObject(
    { status: 422 }
  )
  expect(operations.pending('feedback:create')).toBe(true)
})

it.each(['run', 'recover'])(
  'persists rebound uncertainty through service recreation and %s rejection without dropping its key',
  async (mode) => {
    const { request, operations, records } = setup()
    request.mockRejectedValueOnce(new ApiError('network_unknown', 'A未知'))
    await expect(
      operations.run('feedback:create', '/api/mini/v1/feedback', 'POST', { text: 'original A' })
    ).rejects.toBeInstanceOf(ApiError)
    request.mockRejectedValueOnce(new ApiError('operation_unknown', '无回执', 404))
    await expect(operations.recover('feedback:create', { retry: false })).rejects.toBeInstanceOf(
      ApiError
    )
    request.mockRejectedValueOnce(new ApiError('network_unknown', 'B未知'))
    await expect(
      operations.rebind('feedback:create', { text: 'replacement B' })
    ).rejects.toBeInstanceOf(ApiError)
    const nextKey = vi.fn(() => 'forbidden-key-2')
    const rebuilt = createOperationService({
      session: { userId: () => 'user-1', request },
      key: nextKey,
      storage: {
        get: (key) => records.get(key),
        set: (key, value) => {
          records.set(key, value)
        },
        remove: (key) => {
          records.delete(key)
        }
      }
    })
    request.mockRejectedValueOnce(new ApiError('network_unknown', '建立本次内存重试快照'))
    await expect(
      rebuilt.run('feedback:create', '/api/mini/v1/feedback', 'POST', { text: 'replacement B' })
    ).rejects.toBeInstanceOf(ApiError)
    if (mode === 'recover')
      request.mockRejectedValueOnce(new ApiError('operation_unknown', '无回执', 404))
    request.mockRejectedValueOnce(new ApiError('invalid_request', 'B被拒绝', 422))
    await expect(
      mode === 'recover'
        ? rebuilt.recover('feedback:create')
        : rebuilt.run('feedback:create', '/api/mini/v1/feedback', 'POST', { text: 'replacement B' })
    ).rejects.toMatchObject({ status: 422 })
    expect(rebuilt.pending('feedback:create')).toBe(true)
    const saved = JSON.stringify(Array.from(records.values()))
    expect(saved).toContain('originalUnknown')
    expect(saved).not.toContain('original A')
    expect(saved).not.toContain('replacement B')
    request.mockResolvedValueOnce({ status: 'succeeded', result: { id: 'original-A' } })
    expect(await rebuilt.recover('feedback:create', { retry: false })).toEqual({ id: 'original-A' })
    expect(nextKey).not.toHaveBeenCalled()
    expect(
      request.mock.calls
        .filter(([, options]) => options?.method === 'POST')
        .every(([, options]) => options.key === 'write-key-1')
    ).toBe(true)
    expect(JSON.stringify(Array.from(records.values()))).not.toContain('replacement B')
  }
)
