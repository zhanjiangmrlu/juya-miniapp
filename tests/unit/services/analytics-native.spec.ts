import { expect, it, vi } from 'vitest'

import { createAnalyticsNative } from '@/services/analytics-native'

it('isolates SDK storage keys between environments without changing business storage', () => {
  const saved = new Map<string, unknown>()
  const native = {
    setStorage: ({ key, data }: { key: string; data: unknown }) => saved.set(key, data),
    getStorage: ({ key, success }: { key: string; success: (value: unknown) => void }) =>
      success(saved.get(key)),
    removeStorage: ({ key }: { key: string }) => saved.delete(key),
    setStorageSync: (key: string, value: unknown) => saved.set(key, value),
    getStorageSync: (key: string) => saved.get(key),
    removeStorageSync: (key: string) => saved.delete(key)
  }
  const test = createAnalyticsNative({
    native: () => native,
    hasConsent: () => true,
    storageNamespace: 'test:'
  }).wx as typeof native
  const prod = createAnalyticsNative({
    native: () => native,
    hasConsent: () => true,
    storageNamespace: 'prod:'
  }).wx as typeof native
  const input = { key: 'um_uuid', data: 'test-visitor' }
  test.setStorage(input)
  native.setStorage({ key: 'um_uuid', data: 'business' })
  const success = vi.fn()
  prod.getStorage({ key: 'um_uuid', success })
  expect(success).toHaveBeenCalledWith(undefined)
  prod.setStorageSync('um_uuid', 'production-visitor')
  expect(test.getStorageSync('um_uuid')).toBe('test-visitor')
  expect(prod.getStorageSync('um_uuid')).toBe('production-visitor')
  prod.removeStorage({ key: 'um_uuid' })
  expect(test.getStorageSync('um_uuid')).toBe('test-visitor')
  expect(native.getStorageSync('um_uuid')).toBe('business')
  expect(input.key).toBe('um_uuid')
})
