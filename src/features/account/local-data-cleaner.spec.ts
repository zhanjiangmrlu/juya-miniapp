import { describe, expect, it, vi } from 'vitest'

import {
  clearLocalAccountData,
  clearLocalDeletionDrafts,
  clearLocalLearningData,
  isLearningDataConfirmation
} from './local-data-cleaner'

/** 创建可观察的清理作用域，避免测试依赖真实 uni 存储。 */
function createScope() {
  return {
    clearFeedbackDraft: vi.fn(),
    clearSession: vi.fn(),
    removeStorage: vi.fn(),
    resetLearningStores: vi.fn()
  }
}

describe('local data cleaner', () => {
  it('requires the fixed learning-data confirmation phrase', () => {
    expect(isLearningDataConfirmation('CLEAR_LEARNING_DATA')).toBe(true)
    expect(isLearningDataConfirmation('clear_learning_data')).toBe(false)
    expect(isLearningDataConfirmation('')).toBe(false)
  })

  it('clears learning caches without clearing account, contact, entitlement, or feedback draft', () => {
    const scope = createScope()

    clearLocalLearningData(scope)

    expect(scope.resetLearningStores).toHaveBeenCalledOnce()
    expect(scope.clearFeedbackDraft).not.toHaveBeenCalled()
    expect(scope.clearSession).not.toHaveBeenCalled()
    expect(scope.removeStorage.mock.calls.flat()).toEqual(
      expect.arrayContaining([
        'juya.progress-queue',
        'juya.recordings',
        'juya.review-session',
        'juya.history-cache'
      ])
    )
    expect(scope.removeStorage.mock.calls.flat()).not.toEqual(
      expect.arrayContaining(['juya.profile', 'juya.contact', 'juya.entitlements'])
    )
  })

  it('clears local sensitive data only after account deletion is accepted', () => {
    const scope = createScope()

    clearLocalDeletionDrafts(scope)

    expect(scope.resetLearningStores).toHaveBeenCalledOnce()
    expect(scope.clearFeedbackDraft).toHaveBeenCalledOnce()
    expect(scope.clearSession).not.toHaveBeenCalled()

    clearLocalAccountData(scope)
    expect(scope.clearSession).toHaveBeenCalledOnce()
  })
})
