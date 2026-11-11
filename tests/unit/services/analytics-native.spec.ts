import { afterEach, expect, it, vi } from 'vitest'

import { createAnalyticsNative } from '@/services/analytics-native'

import type { AnalyticsMethod } from '@/shared/types/analytics'

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
})

it('keeps SDK identifiers only in fresh per-generation memory without reading business storage', () => {
  const native = {
    getStorage: () => {
      throw new Error('private business storage accessed')
    }
  }
  const a = createAnalyticsNative({ native: () => native, owner: 'a', hasConsent: () => true })
  const b = createAnalyticsNative({ native: () => native, owner: 'b', hasConsent: () => true })
  ;(a.wx.setStorageSync as AnalyticsMethod)('um_uuid', 'first-uuid')
  expect((a.wx.getStorageSync as AnalyticsMethod)('um_uuid')).toBe('first-uuid')
  expect((b.wx.getStorageSync as AnalyticsMethod)('um_uuid')).toBeUndefined()
  expect(a.wx.login).toBeUndefined()
  expect(a.wx.getUserInfo).toBeUndefined()
  expect(a.wx.getClipboardData).toBeUndefined()
  a.stop()
  expect((a.wx.getStorageSync as AnalyticsMethod)('um_uuid')).toBeUndefined()
})
it('cancels owned timers and permanently discards late native callbacks after stop', () => {
  vi.useFakeTimers()
  let callback!: (value: unknown) => void
  const completed: unknown[] = []
  const native = {
    getSystemInfo: ({ success }: { success: typeof callback }) => {
      callback = success
    }
  }
  const a = createAnalyticsNative({ native: () => native, owner: 'a', hasConsent: () => true })
  ;(a.wx.getSystemInfo as AnalyticsMethod)({ success: (value: unknown) => completed.push(value) })
  a.scope.setTimeout(() => completed.push('timer'), 100)
  a.scope.setInterval(() => completed.push('interval'), 100)
  a.stop()
  callback('old-profile')
  vi.advanceTimersByTime(1000)
  expect(completed).toEqual([])
  expect(vi.getTimerCount()).toBe(0)
})
it('refuses foreign destinations, identity leakage and cross-account SDK payloads', () => {
  const sent: unknown[] = []
  const a = createAnalyticsNative({
    native: () => ({ request: (input: unknown) => sent.push(input) }),
    owner: 'a',
    hasConsent: () => true
  })
  const request = a.wx.request as AnalyticsMethod
  request({ url: 'https://ucc.umeng.com/v1/mini/fetch', data: {} })
  request({
    url: 'https://umini.shujupie.com/wxm_logs',
    data: { h: { itr: { puid: 'b', ud: 'uuid' } } }
  })
  request({
    url: 'https://umini.shujupie.com/wxm_logs',
    data: { h: { itr: { puid: 'a', od: 'private-openid' } } }
  })
  request({
    url: 'https://umini.shujupie.com/wxm_logs',
    data: { h: { itr: { puid: 'a', und: 'private-unionid' } } }
  })
  expect(sent).toEqual([])
})

it('aborts outstanding requests and releases completed tasks before disposal', () => {
  const callbacks: Record<string, AnalyticsMethod>[] = [],
    aborted: number[] = []
  const a = createAnalyticsNative({
    owner: 'a',
    hasConsent: () => true,
    native: () => ({
      request: (input: Record<string, AnalyticsMethod>) => {
        const index = callbacks.length
        callbacks.push(input)
        return { abort: () => aborted.push(index) }
      }
    })
  })
  const request = a.wx.request as AnalyticsMethod
  request({
    url: 'https://umini.shujupie.com/wxm_logs',
    data: { h: { itr: { puid: 'a', ud: 'uuid' } } }
  })
  request({ url: 'https://umini.shujupie.com/uminiprogram_logs/ckdh' })
  callbacks[0]?.complete?.({})
  a.stop()
  expect(aborted).toEqual([1])
})

it('preserves the official SDK response protocol without rewriting imprint or health data', () => {
  const received: unknown[] = []
  const response = { statusCode: 200, data: { code: 200, imprint: 'fixture-imprint' } }
  const native = {
    request: ({ success, complete }: { success: AnalyticsMethod; complete: AnalyticsMethod }) => {
      success(response)
      complete(response)
      return { abort: () => undefined }
    }
  }
  const a = createAnalyticsNative({ native: () => native, owner: 'a', hasConsent: () => true })
  ;(a.wx.request as AnalyticsMethod)({
    url: 'https://umini.shujupie.com/uminiprogram_logs/ckdh',
    success: (value: unknown) => received.push(value)
  })
  expect(received).toEqual([response])
})
