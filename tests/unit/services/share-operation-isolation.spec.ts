import { afterEach, expect, it, vi } from 'vitest'

import { ApiError } from '@/services/errors'
import { createOperationService } from '@/services/operation-service'
import { runtimeMode } from '@/services/runtime-mode'
import { createSessionService } from '@/services/session-service'
import { SESSION_STORAGE_KEY } from '@/shared/constants/account'

afterEach(() => runtimeMode.update({ apiCategory: 'default' }))

it('preserves a dispatched write key when browseOnly interrupts its response and recovers its receipt in full mode', async () => {
  const values = new Map<string, unknown>([
    [SESSION_STORAGE_KEY, { access_token: 'mini_cached', user_id: 'owner' }]
  ])
  const storage = {
    get: (key: string) => values.get(key),
    set: (key: string, value: unknown) => {
      values.set(key, structuredClone(value))
    },
    remove: (key: string) => {
      values.delete(key)
    }
  }
  let finish: (value: unknown) => void = () => undefined,
    key = 0
  const send = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    .mockResolvedValue({
      status: 200,
      data: { status: 'succeeded', result: { id: 'accepted-original' } }
    })
  const session = createSessionService({
    storage,
    send,
    key: () => 'login',
    wechatLogin: vi.fn(),
    onExpired: vi.fn()
  })
  const operations = createOperationService({
    storage,
    session,
    key: () => `original-operation-${++key}`
  })
  const write = operations.run('feedback:create', '/api/mini/v1/feedback', 'POST', { text: 'one' })
  const original = send.mock.calls[0]?.[0].headers['Idempotency-Key']
  runtimeMode.update({ apiCategory: 'browseOnly' })
  finish({ status: 201, data: { id: 'accepted-original' } })
  await expect(write).rejects.toMatchObject({ code: 'session_changed' })
  expect(operations.pending('feedback:create')).toBe(true)
  expect(key).toBe(1)
  runtimeMode.update({ apiCategory: 'default' })
  await expect(operations.recover('feedback:create', { retry: false })).resolves.toEqual({
    id: 'accepted-original'
  })
  expect(send.mock.calls[1]?.[0].path).toBe(`/api/mini/v1/operations/${original}`)
  expect(send.mock.calls[1]?.[0].method).toBe('GET')
  expect(operations.pending('feedback:create')).toBe(false)
  expect(key).toBe(1)
})

it('keeps an earlier unknown key when browseOnly blocks its retry, while forgetting a new unissued operation', async () => {
  const values = new Map<string, unknown>([
    [SESSION_STORAGE_KEY, { access_token: 'mini_cached', user_id: 'owner' }]
  ])
  const storage = {
    get: (key: string) => structuredClone(values.get(key)),
    set: (key: string, value: unknown) => {
      values.set(key, structuredClone(value))
    },
    remove: (key: string) => {
      values.delete(key)
    }
  }
  const send = vi
    .fn()
    .mockRejectedValueOnce(new Error('lost response'))
    .mockResolvedValue({
      status: 200,
      data: { status: 'succeeded', result: { id: 'accepted-original' } }
    })
  let key = 0
  const session = createSessionService({
    storage,
    send,
    key: () => 'login',
    wechatLogin: vi.fn(),
    onExpired: vi.fn()
  })
  const operations = createOperationService({
    storage,
    session,
    key: () => `original-key-${++key}`
  })
  await expect(
    operations.run('feedback:create', '/api/mini/v1/feedback', 'POST', { text: 'one' })
  ).rejects.toMatchObject({ code: 'network_unknown' })
  const original = send.mock.calls[0]?.[0].headers['Idempotency-Key']
  runtimeMode.update({ apiCategory: 'browseOnly' })
  await expect(
    operations.run('feedback:create', '/api/mini/v1/feedback', 'POST', { text: 'one' })
  ).rejects.toMatchObject({ code: 'browse_only' })
  expect(operations.pending('feedback:create')).toBe(true)
  expect(send).toHaveBeenCalledTimes(1)
  await expect(
    operations.run('fresh', '/api/mini/v1/feedback', 'POST', { text: 'fresh' })
  ).rejects.toMatchObject({ code: 'browse_only' })
  expect(operations.pending('fresh')).toBe(false)
  runtimeMode.update({ apiCategory: 'default' })
  await expect(operations.recover('feedback:create', { retry: false })).resolves.toEqual({
    id: 'accepted-original'
  })
  expect(send.mock.calls[1]?.[0].path).toBe(`/api/mini/v1/operations/${original}`)
  expect(send.mock.calls.filter(([request]) => request.method === 'POST')).toHaveLength(1)
})

it('keeps the old key when an official mode change blocks default recover between its verified404 and automatic retry', async () => {
  const values = new Map<string, unknown>([
    [SESSION_STORAGE_KEY, { access_token: 'mini_cached', user_id: 'owner' }]
  ])
  const storage = {
    get: (key: string) => structuredClone(values.get(key)),
    set: (key: string, value: unknown) => {
      values.set(key, structuredClone(value))
    },
    remove: (key: string) => {
      values.delete(key)
    }
  }
  const send = vi
    .fn()
    .mockRejectedValueOnce(new Error('unknown'))
    .mockResolvedValueOnce({
      status: 404,
      data: { error: { code: 'operation_unknown', message: '尚无回执' } }
    })
    .mockResolvedValue({
      status: 200,
      data: { status: 'succeeded', result: { id: 'accepted-original' } }
    })
  const session = createSessionService({
    storage,
    send,
    key: () => 'login',
    wechatLogin: vi.fn(),
    onExpired: vi.fn()
  })
  let change = true
  const operationSession = {
    userId: session.userId,
    request: async <T>(
      path: string,
      options?: { method?: string; body?: unknown; key?: string }
    ): Promise<T> => {
      try {
        return await session.request<T>(path, options)
      } catch (reason) {
        if (change && reason instanceof ApiError && reason.code === 'operation_unknown') {
          change = false
          runtimeMode.update({ apiCategory: 'browseOnly' })
        }
        throw reason
      }
    }
  }
  const operations = createOperationService({
    storage,
    session: operationSession,
    key: () => 'fixed-original-key'
  })
  await expect(
    operations.run('feedback:create', '/api/mini/v1/feedback', 'POST', { text: 'one' })
  ).rejects.toMatchObject({ code: 'network_unknown' })
  await expect(operations.recover('feedback:create')).rejects.toMatchObject({ code: 'browse_only' })
  expect(operations.pending('feedback:create')).toBe(true)
  expect(send).toHaveBeenCalledTimes(2)
  runtimeMode.update({ apiCategory: 'default' })
  await expect(operations.recover('feedback:create', { retry: false })).resolves.toEqual({
    id: 'accepted-original'
  })
  expect(send.mock.calls.filter(([request]) => request.method === 'POST')).toHaveLength(1)
})
