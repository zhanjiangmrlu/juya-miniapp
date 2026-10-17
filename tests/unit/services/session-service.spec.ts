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
  phone: null,
  wechat_contact: null,
  avatar_id: null,
  profile_version: 1,
  contact_version: 1
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
