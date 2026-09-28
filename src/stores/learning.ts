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
  const modules = ref<LearningModule[]>([])
  const sections = computed(() =>
    presentCatalog({ catalog: catalog.value, modules: modules.value })
  )

  /** 并行读取模块与目录；任一失败都使用收紧权限的空目录状态。 */
  async function load(service: CatalogService) {
    loading.value = true
    error.value = false

    try {
      const [moduleResponse, catalogResponse] = await Promise.all([
        service.getModules(),
        service.getCatalog()
      ])
      modules.value = moduleResponse.items
      catalog.value = catalogResponse
    } catch {
      modules.value = []
      catalog.value = { authorization_pending: true, items: [] }
      error.value = true
    } finally {
      loading.value = false
    }
  }

  /** 清除目录页面缓存，后续显示时从服务端重新获取权限投影。 */
  function clear() {
    catalog.value = EMPTY_CATALOG
    modules.value = []
    error.value = false
    loading.value = false
  }

  return { catalog, clear, error, load, loading, modules, sections }
})
