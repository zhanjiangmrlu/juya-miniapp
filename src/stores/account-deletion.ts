import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

import { DELETION_STATE_KEY } from '@/shared/constants/account'
import { useSessionStore } from '@/stores/session'

import type { DeletionRequest } from '@/shared/contracts/account'
import type { AccountDeletionCache } from '@/shared/types/account'

export const useAccountDeletionStore = defineStore('account-deletion', () => {
  const request = ref<DeletionRequest>()
  const session = useSessionStore()
  /** 只使用已确认本人档案的句芽号，不从令牌推测用户身份 */
  const owner = () => (session.isAuthenticated ? session.profile?.juya_id : undefined)

  /** 保存本人服务端注销投影，next 为已受理的申请；未确认本人身份时不缓存 */
  const save = (next: DeletionRequest) => {
    const id = owner()
    if (!id) return
    request.value = next
    uni.setStorageSync(DELETION_STATE_KEY, {
      juya_id: id,
      request: next
    } satisfies AccountDeletionCache)
  }

  /** 只恢复同一已确认本人身份的缓存，旧裸投影或其他账号缓存均删除 */
  const restore = () => {
    const cached = uni.getStorageSync(DELETION_STATE_KEY) as AccountDeletionCache | undefined
    const id = owner()
    if (!id || cached?.juya_id !== id || !cached.request?.status) {
      clear()
      return
    }
    request.value = cached.request
  }

  /** 撤回成功、注销生效或退出身份后移除本地投影 */
  const clear = () => {
    request.value = undefined
    uni.removeStorageSync(DELETION_STATE_KEY)
  }

  watch(
    () => [session.isAuthenticated, session.profile?.juya_id] as const,
    (next, previous) => {
      if (next.some((value, index) => value !== previous[index])) clear()
    },
    { flush: 'sync' }
  )

  return { clear, request, restore, save }
})
