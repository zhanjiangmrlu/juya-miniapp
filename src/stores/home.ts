import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { presentHome } from '@/features/home/home-presenter'
import { useSessionStore } from '@/stores/session'

import type { HomeService } from '@/features/home/home-service'
import type { HomeResponse } from '@/shared/contracts/home'

export const useHomeStore = defineStore('home', () => {
  const data = ref<HomeResponse | null>(null)
  const error = ref(false)
  const loading = ref(false)
  const session = useSessionStore()
  const view = computed(() => presentHome(data.value, session.profile))

  /** 重新读取首页快照；失败时保留品牌兜底并打开当前页网络错误状态。 */
  async function load(service: HomeService) {
    loading.value = true
    error.value = false

    try {
      data.value = await service.getHome()
    } catch {
      data.value = null
      error.value = true
    } finally {
      loading.value = false
    }
  }

  /** 关闭网络提示但不伪造任何首页学习数据。 */
  function dismissError() {
    error.value = false
  }

  /** 清除首页学习快照，保留账号会话供后续重新拉取。 */
  function clear() {
    data.value = null
    error.value = false
    loading.value = false
  }

  return { clear, data, dismissError, error, load, loading, view }
})
