import { defineStore } from 'pinia'
import { ref } from 'vue'

import type { DeletionRequest } from '@/shared/contracts/account'

const DELETION_STATE_KEY = 'juya.deletion-state'

export const useAccountDeletionStore = defineStore('account-deletion', () => {
  const request = ref<DeletionRequest>()

  /** 保存服务端注销投影，供路由切换和应用重启后展示准确生效时间。 */
  function save(next: DeletionRequest) {
    request.value = next
    uni.setStorageSync(DELETION_STATE_KEY, next)
  }

  /** 从本地恢复最近一次服务端响应，不在本地推导状态变化。 */
  function restore() {
    request.value = uni.getStorageSync(DELETION_STATE_KEY) || undefined
  }

  /** 撤回成功或注销生效后移除本地投影。 */
  function clear() {
    request.value = undefined
    uni.removeStorageSync(DELETION_STATE_KEY)
  }

  return { clear, request, restore, save }
})
