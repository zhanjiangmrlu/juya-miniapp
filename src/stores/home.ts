import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { presentHome } from '@/features/home/home-presenter'
import { useSessionStore } from '@/stores/session'

import type { HomeResponse } from '@/shared/contracts/home'
import type { HomeService } from '@/shared/types/home'

export const useHomeStore = defineStore('home', () => {
  const data = ref<HomeResponse | null>(null)
  const error = ref(false)
  const loading = ref(false)
  let generation = 0
  let currentOwner: symbol | undefined
  const session = useSessionStore()
  const view = computed(() => presentHome(data.value, session.profile))

  /** 读取首页，service 为接口服务，owner 标识发起请求的页面 */
  const load = async (service: HomeService, owner?: symbol) => {
    const request = ++generation
    currentOwner = owner
    loading.value = true
    error.value = false

    try {
      const response = await service.getHome()
      if (request !== generation) return
      data.value = response
    } catch {
      if (request !== generation) return
      data.value = null
      error.value = true
    } finally {
      if (request === generation) loading.value = false
    }
  }

  /** 取消指定页面的未完成请求，owner 为离开的页面标识 */
  const cancel = (owner: symbol) => {
    if (owner !== currentOwner) return
    generation++
    currentOwner = undefined
    loading.value = false
  }

  /** 关闭当前页网络提示 */
  const dismissError = () => {
    error.value = false
  }

  /** 清除快照并使旧响应失效，保留账号会话 */
  const clear = () => {
    generation++
    currentOwner = undefined
    data.value = null
    error.value = false
    loading.value = false
  }

  return { cancel, clear, data, dismissError, error, load, loading, view }
})
