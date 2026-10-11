import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAccountDeletionStore } from '@/stores/account-deletion'
import { useSessionStore } from '@/stores/session'

import type { DeletionRequest } from '@/shared/contracts/account'
import type { UserProfile } from '@/shared/contracts/profile'
const pending: DeletionRequest = {
  id: 'delete-one',
  status: 'PENDING',
  requested_at: '2026-10-11',
  effective_at: '2026-10-18',
  revoked_at: null,
  completed_at: null
}
let storage: Map<string, unknown>
beforeEach(() => {
  setActivePinia(createPinia())
  storage = new Map()
  vi.stubGlobal('uni', {
    getStorageSync: (key: string) => storage.get(key),
    setStorageSync: (key: string, value: unknown) => storage.set(key, value),
    removeStorageSync: (key: string) => storage.delete(key)
  })
})
afterEach(() => vi.unstubAllGlobals())
describe('注销缓存身份隔离', () => {
  it('未确认本人身份或旧裸投影缓存不能恢复', () => {
    storage.set('juya.deletion-state', pending)
    const deletion = useAccountDeletionStore()
    deletion.restore()
    expect(deletion.request).toBeUndefined()
    expect(storage.has('juya.deletion-state')).toBe(false)
  })
  it('缓存绑定已确认句芽号，切账号清除投影；同账号学习清理保留注销状态', () => {
    const session = useSessionStore()
    session.accessToken = 'test-session'
    session.profile = { juya_id: 'one' } as UserProfile
    const deletion = useAccountDeletionStore()
    deletion.save(pending)
    expect(storage.get('juya.deletion-state')).toEqual({ juya_id: 'one', request: pending })
    session.invalidateLearningData()
    expect(deletion.request?.id).toBe('delete-one')
    session.profile = { juya_id: 'two' } as UserProfile
    expect(deletion.request).toBeUndefined()
    expect(storage.has('juya.deletion-state')).toBe(false)
  })
  it('B本人不能恢复A拥有的封装缓存', () => {
    const session = useSessionStore()
    session.accessToken = 'test-session'
    session.profile = { juya_id: 'two' } as UserProfile
    storage.set('juya.deletion-state', { juya_id: 'one', request: pending })
    const deletion = useAccountDeletionStore()
    deletion.restore()
    expect(deletion.request).toBeUndefined()
  })
})
