import { afterEach, expect, it, vi } from 'vitest'

import { createRuntimeMode, runtimeMode, syncRuntimeMode } from '@/services/runtime-mode'
import { createSessionService } from '@/services/session-service'
import { SESSION_STORAGE_KEY } from '@/shared/constants/account'

afterEach(() => {
  vi.unstubAllGlobals()
  runtimeMode.update({ apiCategory: 'default' })
})

it('uses official category before launch and rechecks changes rather than inferring scene1154', () => {
  let category = 'browseOnly'
  const mode = createRuntimeMode({ category: () => category })
  expect(mode.browseOnly.value).toBe(true)
  mode.update({ scene: 1001 })
  expect(mode.browseOnly.value).toBe(true)
  category = 'default'
  mode.update({ scene: 1154 })
  expect(mode.browseOnly.value).toBe(false)
  mode.update({ apiCategory: 'browseOnly' })
  expect(mode.browseOnly.value).toBe(true)
})

it('subscribes once to the official category event and updates before page-private work', () => {
  let category = 'default',
    listener: (value: { apiCategory: string }) => void = () => undefined
  const subscribe = vi.fn((callback) => {
    listener = callback
  })
  vi.stubGlobal('wx', { getApiCategory: () => category, onApiCategoryChange: subscribe })
  syncRuntimeMode({ apiCategory: 'browseOnly' })
  syncRuntimeMode({ apiCategory: 'browseOnly' })
  expect(subscribe).toHaveBeenCalledOnce()
  category = 'browseOnly'
  listener({ apiCategory: category })
  expect(() => runtimeMode.assertPrivate()).toThrow('当前为分享摘要')
  category = 'default'
  listener({ apiCategory: category })
  expect(() => runtimeMode.assertPrivate()).not.toThrow()
})

it('blocks cached-session restore, private writes and voluntary login before any platform call', async () => {
  runtimeMode.update({ apiCategory: 'browseOnly' })
  const send = vi.fn(),
    wechatLogin = vi.fn(),
    expired = vi.fn()
  const service = createSessionService({
    storage: {
      get: (key) =>
        key === SESSION_STORAGE_KEY ? { access_token: 'mini_cached', user_id: 'owner' } : null,
      set: vi.fn(),
      remove: vi.fn()
    },
    send,
    wechatLogin,
    onExpired: expired,
    key: () => 'key'
  })
  await expect(service.restore()).rejects.toMatchObject({ code: 'browse_only' })
  await expect(
    service.request('/api/mini/v1/cards/private/complete', { method: 'POST' })
  ).rejects.toMatchObject({ code: 'browse_only' })
  await expect(service.login(true)).rejects.toMatchObject({ code: 'browse_only' })
  expect(send).not.toHaveBeenCalled()
  expect(wechatLogin).not.toHaveBeenCalled()
  expect(expired).not.toHaveBeenCalled()
  expect(service.userId()).toBe('owner')
})

it('rejects private responses which arrive after switching into browseOnly', async () => {
  let accept: (value: unknown) => void = () => undefined
  const service = createSessionService({
    storage: {
      get: () => ({ access_token: 'mini_cached', user_id: 'owner' }),
      set: vi.fn(),
      remove: vi.fn()
    },
    send: () =>
      new Promise((resolve) => {
        accept = resolve as typeof accept
      }),
    wechatLogin: vi.fn(),
    onExpired: vi.fn(),
    key: () => 'key'
  })
  const response = service.request('/api/mini/v1/me')
  runtimeMode.update({ apiCategory: 'browseOnly' })
  accept({ status: 200, data: { id: 'owner', nickname: 'private' } })
  await expect(response).rejects.toMatchObject({ code: 'session_changed' })
})

it('rejects a stale private response even after the mode has already returned to full', async () => {
  let finish: (value: unknown) => void = () => undefined
  const service = createSessionService({
    storage: {
      get: () => ({ access_token: 'mini_cached', user_id: 'owner' }),
      set: vi.fn(),
      remove: vi.fn()
    },
    send: () =>
      new Promise((resolve) => {
        finish = resolve as typeof finish
      }),
    wechatLogin: vi.fn(),
    onExpired: vi.fn(),
    key: () => 'key'
  })
  const old = service.request('/api/mini/v1/me')
  runtimeMode.update({ apiCategory: 'browseOnly' })
  runtimeMode.update({ apiCategory: 'default' })
  finish({ status: 200, data: { id: 'owner' } })
  await expect(old).rejects.toMatchObject({ code: 'session_changed' })
})
