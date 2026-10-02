import { onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

import { createProgressQueue } from '@/features/learning-progress/progress-queue'
import { getRuntimeServices } from '@/services/runtime'
import { useAudioStore } from '@/stores/audio'
import { useSceneStore } from '@/stores/scene'

import type { StablePosition } from '@/shared/contracts/common'
import type { AudioTarget, ClickableSpan, SceneEntry } from '@/shared/contracts/learning'

const PROGRESS_QUEUE_KEY = 'juya.progress-queue'

/** 编排场景与媒体，options.resume 决定返回页面时是否自动重新核验授权 */
export const useScenePage = (options: { resume?: boolean } = {}) => {
  const audio = useAudioStore()
  const runtime = getRuntimeServices()
  const scene = useSceneStore()
  const sceneId = ref('')
  const scrollTarget = ref('')
  const scrollTop = ref(0)
  const imageUrl = ref('')
  const imageOpen = ref(false)
  const imageLoading = ref(false)
  const sheetLoading = ref(false)
  const fullModel = computed(() =>
    scene.model?.kind === 'FULL' && scene.model.sceneId === sceneId.value ? scene.model : undefined
  )
  const originalImageUrl = computed(() => (fullModel.value ? imageUrl.value : ''))
  let generation = 0
  let sheetRequest = 0
  let imageRetried = false
  let completing = false
  let suspended = false
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

  /** 处理授权失败，error 为 API 返回错误，拒绝访问时清空正文及媒体 */
  const handleFailure = (error: unknown) => {
    const status = (error as { status?: number })?.status
    if ([401, 403, 404, 409, 410].includes(status ?? 0)) {
      generation++
      sheetRequest++
      imageUrl.value = ''
      imageOpen.value = false
      audio.dispose()
      scene.clear()
    } else uni.showToast({ icon: 'none', title: '加载失败，请重试' })
  }

  /** 取已发布原图签名，request 为当前页面加载代次 */
  const resolveImage = async (request: number) => {
    const model = fullModel.value
    if (!model?.original_image_asset_id || !model.revision_id) return
    imageLoading.value = true
    try {
      const resource = await runtime.scene.getResource(
        model.sceneId,
        model.original_image_asset_id,
        model.revision_id
      )
      if (request === generation && fullModel.value === model) imageUrl.value = resource.url
    } catch (error) {
      if (request === generation) handleFailure(error)
    } finally {
      if (request === generation) imageLoading.value = false
    }
  }

  /** 使用路由标识加载场景，id 为授权场景 ID，缺失时不猜测场景 */
  const initialize = async (id?: string) => {
    suspended = false
    const request = ++generation
    sheetRequest++
    audio.dispose()
    imageOpen.value = false
    imageUrl.value = ''
    imageRetried = false
    sceneId.value = id ?? ''
    if (!id) {
      scene.clear()
      return
    }
    await scene.load(runtime.scene, id)
    if (request !== generation) return
    await resolveImage(request)
    void progressQueue.flush()
  }

  /** 播放固定版本音频，target 为整段资源或同资源的句子区间 */
  const play = async (target: AudioTarget) => {
    if (!fullModel.value) return
    const sentence = scene.dialogueEntries.find((entry) => entry.entry_id === target.sentence_id)
    if (sentence) savePosition({ entry_id: sentence.source_locator, offset: scrollTop.value })
    await audio.play(target, runtime.scene)
  }

  /** 从服务器获取词卡，entry 为列表引用，span 为点击位置绑定的版本和来源 */
  const inspectEntry = async (entry: SceneEntry, span?: ClickableSpan) => {
    const model = fullModel.value
    if (!model?.revision_id) return
    const request = ++sheetRequest
    const pageRequest = generation
    const position = {
      entry_id: span?.source_locator ?? entry.source_locator,
      offset: scrollTop.value
    }
    sheetLoading.value = true
    try {
      const result = await runtime.scene.getEntry(model.sceneId, entry.entry_id, {
        revision_id: model.revision_id,
        entry_version: span?.entry_version ?? entry.entry_version ?? 1,
        source_locator: position.entry_id
      })
      if (request !== sheetRequest || pageRequest !== generation || fullModel.value !== model)
        return
      scene.showSheet(
        {
          ...entry,
          ...result,
          source_sentence_ids: [...result.source_sentence_ids],
          text: result.english,
          entry_type: entry.entry_type,
          audio:
            result.audio_target_id && result.audio_version_id
              ? {
                  target_id: result.audio_target_id,
                  version_id: result.audio_version_id,
                  target_type: 'ENTRY',
                  scene_id: model.sceneId,
                  revision_id: model.revision_id
                }
              : undefined
        },
        position
      )
    } catch (error) {
      if (request === sheetRequest) handleFailure(error)
    } finally {
      if (request === sheetRequest) sheetLoading.value = false
    }
  }

  /** 打开被点击片段对应词条，entry 为句子，span 为服务端确认的字符片段 */
  const inspectSentence = async (entry: SceneEntry, span?: ClickableSpan) => {
    if (!span) return
    const matched = fullModel.value?.entries.find(
      (candidate) => candidate.entry_id === span.entry_id && candidate.entry_type !== 'DIALOGUE'
    )
    if (matched) await inspectEntry(matched, span)
    savePosition({ entry_id: entry.source_locator, offset: scrollTop.value })
  }

  /** 关闭弹层但保持当前滚动像素，不触发来源跳转 */
  const closeSheet = () => {
    sheetRequest++
    sheetLoading.value = false
    scene.closeSheet()
  }

  /** 收藏权威词卡，entry 为固定发布版本的词条快照 */
  const favorite = async (entry: SceneEntry) => {
    if (entry.favorited || !fullModel.value?.revision_id) return
    try {
      await runtime.client.post('/api/v1/favorites', {
        entry_stable_id: entry.entry_id,
        entry_type: entry.entry_type,
        scene_id: sceneId.value,
        revision_id: entry.revision_id ?? fullModel.value.revision_id,
        entry_version: entry.entry_version ?? 1,
        sentence_snapshot: entry.sentence_snapshot ?? entry.text,
        source_locator: entry.source_locator,
        text: entry.text
      })
      entry.favorited = true
      uni.showToast({ icon: 'success', title: '已收藏' })
    } catch (error) {
      handleFailure(error)
    }
  }

  /** 保存稳定阅读位置，position 为最后可见句子及相对偏移 */
  const savePosition = (position: StablePosition) => {
    if (sceneId.value) {
      uni.setStorageSync(`juya.scene-position.${sceneId.value}`, position)
      progressQueue.enqueuePosition(sceneId.value, position)
    }
  }

  /** 打开授权原图，复用当前签名，图片失败时最多重新签名一次 */
  const openImage = async () => {
    if (!fullModel.value?.original_image_asset_id) return
    if (!imageUrl.value) await resolveImage(generation)
    if (originalImageUrl.value) imageOpen.value = true
  }

  /** 图片错误时重签一次，再次失败显示可重试提示 */
  const handleImageError = async () => {
    if (imageRetried) {
      imageOpen.value = false
      uni.showToast({ icon: 'none', title: '原图暂不可用' })
      return
    }
    imageRetried = true
    await resolveImage(generation)
  }

  /** 完成学习，成功才返回完成标识，防止重复点击 */
  const complete = async (): Promise<boolean> => {
    if (completing || !fullModel.value) return false
    completing = true
    try {
      await progressQueue.flush()
      await runtime.scene.complete(sceneId.value)
      return true
    } catch (error) {
      handleFailure(error)
      return false
    } finally {
      completing = false
    }
  }

  /** 隐藏页面后取消词卡与原图请求并释放播放器 */
  const disposeAudio = () => {
    suspended = true
    generation++
    sheetRequest++
    sheetLoading.value = false
    imageLoading.value = false
    imageOpen.value = false
    audio.dispose()
    void progressQueue.flush()
  }

  /** 返回已隐藏页面时重新核验当前场景，跟读页由自身重建录音端口 */
  onShow(() => {
    if (suspended && options.resume !== false && sceneId.value) void initialize(sceneId.value)
  })

  return {
    audio,
    closeSheet,
    complete,
    disposeAudio,
    favorite,
    fullModel,
    handleFailure,
    handleImageError,
    imageLoading,
    imageOpen,
    initialize,
    inspectEntry,
    inspectSentence,
    openImage,
    originalImageUrl,
    play,
    savePosition,
    scene,
    sceneId,
    scrollTarget,
    scrollTop,
    sheetLoading
  }
}
