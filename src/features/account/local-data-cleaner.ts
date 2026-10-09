import { LEARNING_STORAGE_KEYS } from '@/shared/constants/account'
import { useAudioStore } from '@/stores/audio'
import { useFavoriteStore } from '@/stores/favorites'
import { useFeedbackDraftStore } from '@/stores/feedback-draft'
import { useHomeStore } from '@/stores/home'
import { useLearningStore } from '@/stores/learning'
import { useSceneStore } from '@/stores/scene'
import { useSessionStore } from '@/stores/session'

import type { LocalDataScope } from '@/shared/types/account'

export type { LocalDataScope } from '@/shared/types/account'

/** 只接受产品约定的固定确认值，防止模糊文案触发不可逆清理。 */
export function isLearningDataConfirmation(value: string): boolean {
  return value === 'CLEAR_LEARNING_DATA'
}

/** 清除进度、录音、收藏、复习及页面缓存，不触碰身份、联系资料和权益。 */
export function clearLocalLearningData(scope: LocalDataScope): void {
  for (const key of LEARNING_STORAGE_KEYS) scope.removeStorage(key)
  scope.resetLearningStores()
}

/** 注销申请受理后清除学习痕迹与反馈草稿，同时保留会话以支持七天内撤回。 */
export function clearLocalDeletionDrafts(scope: LocalDataScope): void {
  clearLocalLearningData(scope)
  scope.clearFeedbackDraft()
}

/** 注销最终生效后再清除本地会话身份。 */
export function clearLocalAccountData(scope: LocalDataScope): void {
  clearLocalDeletionDrafts(scope)
  scope.clearSession()
}

/** 连接 uni 存储与各领域 store，供账号页面复用同一清理边界。 */
export function createUniLocalDataScope(): LocalDataScope {
  return {
    clearFeedbackDraft: () => useFeedbackDraftStore().clear(),
    clearSession: () => useSessionStore().clear(),
    removeStorage: (key) => uni.removeStorageSync(key),
    resetLearningStores: () => {
      useAudioStore().dispose()
      useFavoriteStore().clear()
      useHomeStore().clear()
      useLearningStore().clear()
      useSceneStore().clear()
    }
  }
}
