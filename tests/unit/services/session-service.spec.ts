import { describe, expect, it, vi } from 'vitest'

import { createSessionService } from '@/services/session-service'
import { SESSION_STORAGE_KEY } from '@/shared/constants/account'

const setup = () => {
  const values = new Map<string, unknown>()
  const storage = {
    get: (key: string) => values.get(key),
    set: (key: string, value: unknown) => {
      values.set(key, value)
    },
    remove: (key: string) => {
      values.delete(key)
    }
  }
  const send = vi.fn(),
    wechatLogin = vi.fn(async () => 'one-use-code'),
    onExpired = vi.fn()
  let operation = 0
  return {
    storage,
    send,
    wechatLogin,
    onExpired,
    service: createSessionService({
      storage,
      send,
      wechatLogin,
      onExpired,
      key: () => `operation-key-${++operation}`
    })
  }
}
const user = {
  id: 'stable-user',
  nickname: '学习者',
  avatar_id: null,
  profile_version: 1
}

describe('voluntary WeChat identity', () => {
  it('does not request a WeChat code until the user agrees and clicks login', async () => {
    const fixture = setup()
    await fixture.service.restore()
    await expect(fixture.service.login(false)).rejects.toMatchObject({ code: 'consent_required' })
    expect(fixture.wechatLogin).not.toHaveBeenCalled()
    expect(fixture.send).not.toHaveBeenCalled()
  })
  it('reuses a one-use code and operation key after a lost login response', async () => {
    const fixture = setup()
    fixture.send.mockRejectedValueOnce(new Error('connection lost')).mockResolvedValueOnce({
      status: 200,
      data: { access_token: 'mini_real-token', expires_at: '2026-10-18T00:00:00Z', user }
    })
    await expect(fixture.service.login(true)).rejects.toMatchObject({ code: 'network_unknown' })
    const result = await fixture.service.login(true)
    expect(result.user.id).toBe('stable-user')
    expect(fixture.wechatLogin).toHaveBeenCalledTimes(1)
    expect(fixture.send.mock.calls[0]?.[0].headers['Idempotency-Key']).toBe(
      fixture.send.mock.calls[1]?.[0].headers['Idempotency-Key']
    )
    expect(fixture.send.mock.calls[0]?.[0].body).toEqual({
      code: 'one-use-code',
      consent: true,
      consent_version: '2026-10-17'
    })
    const stored = JSON.stringify(fixture.storage.get(SESSION_STORAGE_KEY))
    expect(stored).toContain('mini_real-token')
    expect(stored).not.toContain('phone')
  })
  it('restores an existing business token without silently obtaining a new identity', async () => {
    const fixture = setup()
    fixture.storage.set(SESSION_STORAGE_KEY, {
      access_token: 'mini_stored',
      user_id: 'stable-user',
      expires_at: '2000-01-01T00:00:00Z'
    })
    fixture.send.mockResolvedValue({ status: 200, data: user })
    expect(await fixture.service.restore()).toMatchObject({ id: 'stable-user' })
    expect(fixture.send.mock.calls[0]?.[0].headers.Authorization).toBe('Bearer mini_stored')
    expect(fixture.wechatLogin).not.toHaveBeenCalled()
  })
  it('clears an expired session, notifies the UI, and waits for a new user action', async () => {
    const fixture = setup()
    fixture.storage.set(SESSION_STORAGE_KEY, {
      access_token: 'mini_expired',
      user_id: 'stable-user'
    })
    fixture.send.mockResolvedValue({
      status: 401,
      data: { error: { code: 'unauthenticated', message: '请重新登录' } }
    })
    await expect(fixture.service.restore()).rejects.toMatchObject({ code: 'unauthenticated' })
    expect(fixture.storage.get(SESSION_STORAGE_KEY)).toBeUndefined()
    expect(fixture.onExpired).toHaveBeenCalledTimes(1)
    expect(fixture.wechatLogin).not.toHaveBeenCalled()
  })
})

it('rejects a late authenticated response after local logout instead of restoring old personal data', async () => {
  const fixture = setup()
  let finish!: (response: unknown) => void
  fixture.storage.set(SESSION_STORAGE_KEY, {
    access_token: 'mini_original',
    user_id: 'stable-user'
  })
  fixture.send.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  const restoring = fixture.service.restore()
  fixture.service.clear()
  finish({ status: 200, data: user })
  await expect(restoring).rejects.toMatchObject({ code: 'session_changed' })
  expect(fixture.storage.get(SESSION_STORAGE_KEY)).toBeUndefined()
})

it('does not revive a login after the user has cleared the session', async () => {
  const fixture = setup()
  let finish!: (response: unknown) => void
  fixture.send.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  const login = fixture.service.login(true)
  await Promise.resolve()
  fixture.service.clear()
  finish({
    status: 200,
    data: { access_token: 'mini_late', expires_at: '2026-10-18T00:00:00Z', user }
  })
  await expect(login).rejects.toMatchObject({ code: 'session_changed' })
  expect(fixture.storage.get(SESSION_STORAGE_KEY)).toBeUndefined()
})

it('retains login replay credentials after a gateway server error', async () => {
  const fixture = setup()
  fixture.send
    .mockResolvedValueOnce({
      status: 503,
      data: { error: { code: 'internal_error', message: '结果暂未确认' } }
    })
    .mockResolvedValueOnce({
      status: 200,
      data: { access_token: 'mini_recovered', expires_at: '2026-10-18T00:00:00Z', user }
    })
  await expect(fixture.service.login(true)).rejects.toMatchObject({ status: 503 })
  await fixture.service.login(true)
  expect(fixture.wechatLogin).toHaveBeenCalledTimes(1)
  expect(fixture.send.mock.calls[0]?.[0].headers['Idempotency-Key']).toBe(
    fixture.send.mock.calls[1]?.[0].headers['Idempotency-Key']
  )
})

// Losing optional authentication must never replay an account write or cross an identity epoch
it('reads public content as a guest without requesting an identity', async () => {
  const f = setup()
  f.send.mockResolvedValue({ status: 200, data: { items: [] } })
  await expect(f.service.contentRequest('/api/mini/v1/cards')).resolves.toEqual({ items: [] })
  expect(f.send.mock.calls[0][0].headers.Authorization).toBeUndefined()
  expect(f.wechatLogin).not.toHaveBeenCalled()
})
it('retries an expired public GET exactly once anonymously and clears identity', async () => {
  const f = setup()
  f.storage.set(SESSION_STORAGE_KEY, { access_token: 'mini_old', user_id: 'old' })
  f.send.mockResolvedValueOnce({ status: 200, data: { ...user, id: 'old' } })
  await f.service.restore()
  f.send
    .mockResolvedValueOnce({ status: 401, data: { error: { code: 'unauthenticated' } } })
    .mockResolvedValueOnce({ status: 200, data: { state: null } })
  await expect(f.service.contentRequest('/api/mini/v1/cards/card')).resolves.toEqual({
    state: null
  })
  expect(f.send.mock.calls[1][0].headers.Authorization).toBe('Bearer mini_old')
  expect(f.send.mock.calls[2][0].headers.Authorization).toBeUndefined()
  expect(f.service.userId()).toBeNull()
  expect(f.onExpired).toHaveBeenCalledTimes(1)
})
it('does not retry optional POST or private writes after 401', async () => {
  const f = setup()
  f.storage.set(SESSION_STORAGE_KEY, { access_token: 'mini_old', user_id: 'old' })
  f.send.mockResolvedValueOnce({ status: 200, data: { ...user, id: 'old' } })
  await f.service.restore()
  f.send.mockResolvedValue({ status: 401, data: { error: { code: 'unauthenticated' } } })
  await expect(
    f.service.contentRequest('/api/mini/v1/cards/card/words/word/pronunciation', {
      method: 'POST',
      key: 'key-long-enough-123'
    })
  ).rejects.toMatchObject({ status: 401 })
  expect(f.send).toHaveBeenCalledTimes(2)
  await expect(f.service.request('/api/mini/v1/me', { method: 'PUT' })).rejects.toMatchObject({
    code: 'unauthenticated'
  })
  expect(f.send).toHaveBeenCalledTimes(2)
})
it('rejects an old guest response after guest identity invalidation', async () => {
  const f = setup()
  let finish!: (response: unknown) => void
  f.send.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  const pending = f.service.contentRequest('/api/mini/v1/cards')
  f.service.clear()
  finish({ status: 200, data: { items: ['old'] } })
  await expect(pending).rejects.toMatchObject({ code: 'session_changed' })
})
it('does not let the content channel call personal endpoints', async () => {
  const f = setup()
  await expect(f.service.contentRequest('/api/mini/v1/me')).rejects.toMatchObject({
    code: 'content_path_invalid'
  })
  expect(f.send).not.toHaveBeenCalled()
})
