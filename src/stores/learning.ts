import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { presentCatalog } from '@/features/learning/catalog-presenter'

import type { CatalogService } from '@/features/learning/catalog-service'
import type { LearningCatalogResponse, LearningModule } from '@/shared/contracts/learning'

const EMPTY_CATALOG: LearningCatalogResponse = { authorization_pending: false, items: [] }

export const useLearningStore = defineStore('learning', () => {
  const catalog = ref<LearningCatalogResponse>(EMPTY_CATALOG)
  const error = ref(false)
  const loading = ref(false)
  let generation = 0
  let currentOwner: symbol | undefined
  const modules = ref<LearningModule[]>([])
  const sections = computed(() =>
    presentCatalog({ catalog: catalog.value, modules: modules.value })
  )

  /** 读取安全目录，service 为接口服务，owner 标识发起请求的页面 */
  const load = async (service: CatalogService, owner?: symbol) => {
    const request = ++generation
    currentOwner = owner
    loading.value = true
    error.value = false

    try {
      const [moduleResponse, catalogResponse] = await Promise.all([
        service.getModules(),
        service.getCatalog()
      ])
      if (request !== generation) return
      modules.value = moduleResponse.items
      catalog.value = catalogResponse
    } catch {
      if (request !== generation) return
      modules.value = []
      catalog.value = { authorization_pending: true, items: [] }
      error.value = true
    } finally {
      if (request === generation) loading.value = false
    }
  }

  /** 取消指定页面的请求，owner 为离开的页面标识 */
  const cancel = (owner: symbol) => {
    if (owner !== currentOwner) return
    generation++
    currentOwner = undefined
    loading.value = false
  }

  /** 清除目录缓存并使旧权限响应失效 */
  const clear = () => {
    generation++
    currentOwner = undefined
    catalog.value = EMPTY_CATALOG
    modules.value = []
    error.value = false
    loading.value = false
  }

  return { cancel, catalog, clear, error, load, loading, modules, sections }
})
