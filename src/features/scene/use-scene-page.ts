import { computed, ref } from 'vue'

import { createProgressQueue } from '@/features/learning-progress/progress-queue'
import { chooseSheetEntry } from '@/features/vocabulary-sheet/sheet-controller'
import { getRuntimeServices } from '@/services/runtime'
import { useAudioStore } from '@/stores/audio'
import { useSceneStore } from '@/stores/scene'

import type { StablePosition } from '@/shared/contracts/common'
import type { AudioTarget, SceneEntry } from '@/shared/contracts/learning'

const PROGRESS_QUEUE_KEY = 'juya.progress-queue'

/** 创建场景页面共享编排，集中处理加载、音频、弹层、收藏和阅读位置。 */
export function useScenePage() {
  const audio = useAudioStore()
  const runtime = getRuntimeServices()
  const scene = useSceneStore()
  const sceneId = ref('')
  const scrollTarget = ref('')
  const fullModel = computed(() => (scene.model?.kind === 'FULL' ? scene.model : undefined))
  const progressQueue = createProgressQueue(
    {
      clear: () => uni.removeStorageSync(PROGRESS_QUEUE_KEY),
      load: () => uni.getStorageSync(PROGRESS_QUEUE_KEY) || [],
      save: (commands) => uni.setStorageSync(PROGRESS_QUEUE_KEY, commands)
    },
    async (command, idempotencyKey) => {
      if (command.kind === 'COMPLETE') {
        await runtime.scene.complete(command.sceneId, idempotencyKey)
        return
      }

      await runtime.scene.savePosition(
        command.sceneId,
        {
          client_sequence: command.clientSequence,
          entry_id: command.position.entry_id,
          offset: command.position.offset
        },
        idempotencyKey
      )
    }
  )

  /** 使用路由场景标识打开内容，缺失标识时回退到开发示例场景。 */
  async function initialize(id?: string) {
    sceneId.value = id || 'scene-castle'
    await scene.load(runtime.scene, sceneId.value)
  }

  /** 交给全局唯一播放器处理音频目标。 */
  async function play(target: AudioTarget) {
    await audio.play(target, runtime.scene)
  }

  /** 从句子稳定来源位置查找词汇/语块，语块优先，并打开统一底部弹层。 */
  function inspectSentence(entry: SceneEntry) {
    const model = fullModel.value
    if (!model) return
    const matches = model.entries.filter(
      (candidate) =>
        candidate.source_locator === entry.source_locator &&
        (candidate.entry_type === 'PHRASE' || candidate.entry_type === 'VOCABULARY')
    )
    const matched = chooseSheetEntry(matches)
    if (matched) {
      scene.showSheet(matched, { entry_id: entry.source_locator, offset: 0 })
    }
  }

  /** 直接从重点词汇或语块列表打开统一弹层。 */
  function inspectEntry(entry: SceneEntry) {
    scene.showSheet(entry, { entry_id: entry.source_locator, offset: 0 })
  }

  /** 关闭弹层并恢复打开前保存的稳定来源位置。 */
  function closeSheet() {
    const position = scene.closeSheet()
    if (position) scrollTarget.value = position.entry_id
  }

  /** 收藏条目并保持弹层打开，让用户可继续播放或返回原文。 */
  async function favorite(entry: SceneEntry) {
    const source = fullModel.value?.entries.find(
      (candidate) =>
        candidate.entry_type === 'DIALOGUE' && candidate.source_locator === entry.source_locator
    )
    await runtime.client.post('/api/v1/favorites', {
      entry_stable_id: entry.entry_id,
      entry_type: entry.entry_type,
      scene_id: sceneId.value,
      sentence_snapshot: source?.text ?? entry.text,
      source_locator: entry.source_locator,
      text: entry.text
    })
    uni.showToast({ icon: 'success', title: '已收藏' })
  }

  /** 将最后可见的稳定定位送入 800ms 合并队列。 */
  function savePosition(position: StablePosition) {
    if (!sceneId.value) return
    progressQueue.enqueuePosition(sceneId.value, position)
  }

  /** 页面隐藏时释放播放器，阅读位置队列继续持久化等待发送。 */
  function disposeAudio() {
    audio.dispose()
  }

  return {
    audio,
    closeSheet,
    disposeAudio,
    favorite,
    fullModel,
    initialize,
    inspectEntry,
    inspectSentence,
    play,
    savePosition,
    scene,
    sceneId,
    scrollTarget
  }
}
