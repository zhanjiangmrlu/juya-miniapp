import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

import { createSceneModel, createSceneViewState } from '@/features/scene/scene-model'
import { openSheet } from '@/features/vocabulary-sheet/sheet-controller'
import { SceneEntryType } from '@/shared/enums/learning'
import { SceneModelKind } from '@/shared/enums/scene'
import { useFavoriteStore } from '@/stores/favorites'
import { useSessionStore } from '@/stores/session'

import type { StablePosition } from '@/shared/contracts/common'
import type { SceneEntry } from '@/shared/contracts/learning'
import type { SceneModel, SceneService } from '@/shared/types/scene'
import type { SheetController } from '@/shared/types/vocabulary-sheet'

export const useSceneStore = defineStore('scene', () => {
  const error = ref(false)
  const loading = ref(false)
  const model = ref<SceneModel>()
  const sheet = ref<SheetController>()
  const viewState = ref(createSceneViewState())
  let generation = 0
  const dialogueEntries = computed(() =>
    model.value?.kind === SceneModelKind.FULL
      ? model.value.entries.filter((entry) => entry.entry_type === SceneEntryType.DIALOGUE)
      : []
  )
  const vocabularyEntries = computed(() =>
    model.value?.kind === SceneModelKind.FULL
      ? model.value.entries.filter((entry) => entry.entry_type === SceneEntryType.VOCABULARY)
      : []
  )
  const phraseEntries = computed(() =>
    model.value?.kind === SceneModelKind.FULL
      ? model.value.entries.filter((entry) => entry.entry_type === SceneEntryType.PHRASE)
      : []
  )

  /** 打开场景，service 为授权服务，sceneId 为稳定场景标识 */
  const load = async (service: SceneService, sceneId: string) => {
    const request = ++generation
    model.value = undefined
    loading.value = true
    error.value = false
    sheet.value = undefined
    viewState.value = createSceneViewState(viewState.value)

    try {
      const response = await service.open(sceneId)
      if (request === generation) {
        const next = createSceneModel(response)
        if (next.kind === SceneModelKind.FULL && next.content_version) {
          const favorites = useFavoriteStore()
          for (const entry of next.entries) {
            if (!entry.sense_id || !entry.source_id) continue
            favorites.seedState(
              {
                content_type: next.content_type ?? 'dialogue',
                content_id: next.sceneId,
                content_version: next.content_version,
                entry_id: entry.entry_id,
                sense_id: entry.sense_id,
                source_id: entry.source_id
              },
              { is_favorited: Boolean(entry.favorited), favorite_id: entry.favorite_id ?? null }
            )
          }
        }
        model.value = next
      }
    } catch {
      if (request !== generation) return
      error.value = true
      model.value = undefined
    } finally {
      if (request === generation) loading.value = false
    }
  }

  /** 切换中文辅助显示，状态只在当前场景页面生命周期内有效 */
  const toggleChinese = () => {
    viewState.value.chineseVisible = !viewState.value.chineseVisible
  }

  /** 打开词卡，entry 为权威词条，position 为弹层前的稳定位置 */
  const showSheet = (entry: SceneEntry, position: StablePosition) => {
    sheet.value = openSheet(entry, position)
  }

  /** 关闭弹层并返回页面应恢复的稳定阅读位置 */
  const closeSheet = (): StablePosition | undefined => {
    const position = sheet.value?.close()
    sheet.value = undefined
    return position
  }

  /** 清空当前场景正文、弹层和阅读状态 */
  const clear = () => {
    generation++
    error.value = false
    loading.value = false
    model.value = undefined
    sheet.value = undefined
    viewState.value = createSceneViewState()
  }

  watch(() => useSessionStore().cleanupGeneration, clear, { flush: 'sync' })
  return {
    clear,
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
