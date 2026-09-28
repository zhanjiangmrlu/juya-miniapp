import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import {
  createSceneModel,
  createSceneViewState,
  type SceneModel
} from '@/features/scene/scene-model'
import { openSheet, type SheetController } from '@/features/vocabulary-sheet/sheet-controller'

import type { SceneService } from '@/features/scene/scene-service'
import type { StablePosition } from '@/shared/contracts/common'
import type { SceneEntry } from '@/shared/contracts/learning'

export const useSceneStore = defineStore('scene', () => {
  const error = ref(false)
  const loading = ref(false)
  const model = ref<SceneModel>()
  const sheet = ref<SheetController>()
  const viewState = ref(createSceneViewState())
  const dialogueEntries = computed(() =>
    model.value?.kind === 'FULL'
      ? model.value.entries.filter((entry) => entry.entry_type === 'DIALOGUE')
      : []
  )
  const vocabularyEntries = computed(() =>
    model.value?.kind === 'FULL'
      ? model.value.entries.filter((entry) => entry.entry_type === 'VOCABULARY')
      : []
  )
  const phraseEntries = computed(() =>
    model.value?.kind === 'FULL'
      ? model.value.entries.filter((entry) => entry.entry_type === 'PHRASE')
      : []
  )

  /** 打开场景并根据服务端访问级别建立互斥页面模型。 */
  async function load(service: SceneService, sceneId: string) {
    loading.value = true
    error.value = false
    sheet.value = undefined
    viewState.value = createSceneViewState(viewState.value)

    try {
      model.value = createSceneModel(await service.open(sceneId))
    } catch {
      error.value = true
      model.value = undefined
    } finally {
      loading.value = false
    }
  }

  /** 切换中文辅助显示，状态只在当前场景页面生命周期内有效。 */
  function toggleChinese() {
    viewState.value.chineseVisible = !viewState.value.chineseVisible
  }

  /** 打开词汇弹层并记录当前稳定阅读位置。 */
  function showSheet(entry: SceneEntry, position: StablePosition) {
    sheet.value = openSheet(entry, position)
  }

  /** 关闭弹层并返回页面应恢复的稳定阅读位置。 */
  function closeSheet(): StablePosition | undefined {
    const position = sheet.value?.close()
    sheet.value = undefined
    return position
  }

  return {
    closeSheet,
    dialogueEntries,
    error,
    load,
    loading,
    model,
    phraseEntries,
    sheet,
    showSheet,
    toggleChinese,
    viewState,
    vocabularyEntries
  }
})
