import { onShow } from '@dcloudio/uni-app'
import {
  computed,
  getCurrentInstance,
  getCurrentScope,
  onScopeDispose,
  provide,
  ref,
  watch,
  watchEffect
} from 'vue'

import { createProgressQueue } from '@/features/learning-progress/progress-queue'
import { sceneEntryKey } from '@/features/scene/scene-entry-identity'
import { getAnalytics } from '@/services/analytics/runtime'
import { createRequestId } from '@/services/http/request-id'
import { getRuntimeServices } from '@/services/runtime'
import { AUDIO_PAGE_OWNER_KEY } from '@/shared/constants/audio-owner'
import { PROGRESS_QUEUE_KEY } from '@/shared/constants/learning-progress'
import { WORD_IMAGE_CONTROLLER_KEY } from '@/shared/constants/scene-images'
import { AnalyticsEvent } from '@/shared/enums/analytics'
import { AudioTargetType } from '@/shared/enums/audio'
import { SceneEntryType } from '@/shared/enums/learning'
import { ProgressCommandKind } from '@/shared/enums/learning-progress'
import { SceneModelKind, WordImageStatus } from '@/shared/enums/scene'
import { useAudioStore } from '@/stores/audio'
import { useFavoriteStore } from '@/stores/favorites'
import { useSceneStore } from '@/stores/scene'
import { useSessionStore } from '@/stores/session'

import type { StablePosition } from '@/shared/contracts/common'
import type { FavoriteReference } from '@/shared/contracts/favorites'
import type { AudioTarget, ClickableSpan, SceneEntry } from '@/shared/contracts/learning'
import type { HttpStatusCarrier } from '@/shared/types/http'
import type { ScenePageOptions } from '@/shared/types/scene'

/** 编排场景与媒体，options.resume 决定返回页面时是否自动重新核验授权 */
export const useScenePage = (options: ScenePageOptions = {}) => {
  const analytics = getAnalytics()
  const visitKey = createRequestId()
  const opened = new Set<string>()
  const audio = useAudioStore()
  const audioOwner = Symbol('scene-page-audio')
  if (getCurrentInstance()) provide(AUDIO_PAGE_OWNER_KEY, audioOwner)
  const runtime = getRuntimeServices()
  const scene = useSceneStore()
  const favorites = useFavoriteStore()
  const session = useSessionStore()
  const sceneId = ref('')
  const scrollTarget = ref('')
  const scrollTop = ref(0)
  const imageUrl = ref('')
  const imageOpen = ref(false)
  const imageLoading = ref(false)
  const sheetLoading = ref(false)
  const wordImageStates = ref<Record<string, WordImageStatus>>({})
  const wordImageRequests = new Map<string, number>()
  const fullModel = computed(() =>
    scene.model?.kind === SceneModelKind.FULL && scene.model.sceneId === sceneId.value
      ? scene.model
      : undefined
  )
  const originalImageUrl = computed(() => (fullModel.value ? imageUrl.value : ''))
  let generation = 0
  let sheetRequest = 0
  let imageRetried = false
  let completing = false
  let suspended = false
  const progressOwners = new Map<string, { generation: number; model: typeof fullModel.value }>()
  /** 提取可收藏的确认目标，entry为本篇条目，缺少稳定身份时拒绝猜配 */
  const referenceFor = (entry: SceneEntry): FavoriteReference | undefined => {
    const model = fullModel.value
    if (!model?.content_version || !entry.sense_id || !entry.source_id) return undefined
    return {
      content_type: model.content_type ?? 'dialogue',
      content_id: model.sceneId,
      content_version: model.content_version,
      entry_id: entry.entry_id,
      sense_id: entry.sense_id,
      source_id: entry.source_id
    }
  }
  const pendingFavoriteIds = computed(() =>
    (fullModel.value?.entries ?? [])
      .filter((entry) => {
        const reference = referenceFor(entry)
        return reference && favorites.stateFor(reference).pending
      })
      .map(sceneEntryKey)
  )
  /** 将银行／来源共享可信状态应用至当前已加载条目 */
  watchEffect(
    () => {
      for (const entry of [
        ...(fullModel.value?.entries ?? []),
        ...(scene.sheet ? [scene.sheet.snapshot.entry] : [])
      ]) {
        const reference = referenceFor(entry)
        if (!reference) continue
        const state = favorites.stateFor(reference)
        entry.favorited = state.is_favorited
        entry.favorite_id = state.favorite_id
      }
    },
    { flush: 'sync' }
  )
  const progressQueue = createProgressQueue(
    {
      clear: () => uni.removeStorageSync(PROGRESS_QUEUE_KEY),
      load: () => uni.getStorageSync(PROGRESS_QUEUE_KEY) || [],
      save: (commands) => uni.setStorageSync(PROGRESS_QUEUE_KEY, commands)
    },
    async (command, idempotencyKey) => {
      progressOwners.set(idempotencyKey, { generation, model: fullModel.value })
      if (command.kind === ProgressCommandKind.COMPLETE) {
        await runtime.scene.complete(command.sceneId, idempotencyKey)
        progressOwners.delete(idempotencyKey)
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
      progressOwners.delete(idempotencyKey)
    },
    {
      /** 仅清理仍属于当前场景的拒绝，command 为失效命令，error 为服务端终态 */
      onTerminalFailure: (command, error) => {
        const owner = progressOwners.get(command.idempotencyKey)
        progressOwners.delete(command.idempotencyKey)
        if (
          command.sceneId === sceneId.value &&
          owner?.generation === generation &&
          owner.model &&
          owner.model === fullModel.value
        )
          handleFailure(error)
      }
    }
  )
  if (getCurrentScope()) onScopeDispose(progressQueue.dispose)
  watch(
    () => session.cleanupGeneration,
    () => {
      suspended = true
      generation++
      sheetRequest++
      progressQueue.clear()
      imageUrl.value = ''
      imageOpen.value = false
      wordImageStates.value = {}
      scene.clear()
    },
    { flush: 'sync' }
  )

  /** 处理授权失败，error 为 API 返回错误，拒绝访问时清空正文及媒体 */
  const handleFailure = (error: unknown) => {
    const status = (error as HttpStatusCarrier)?.status
    if ([401, 403, 404, 409, 410].includes(status ?? 0)) {
      suspended = true
      generation++
      sheetRequest++
      imageUrl.value = ''
      imageOpen.value = false
      wordImageStates.value = {}
      audio.cancelOwned(audioOwner)
      scene.clear()
      uni.showToast({ icon: 'none', title: '内容访问已失效，请返回学习页重新确认' })
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
  /** 解析单个词汇图片，entry 为本版词条，request 为页面代次，重试重新取得签名 */
  const resolveWordImage = async (entry: SceneEntry, request: number) => {
    const model = fullModel.value
    if (!model?.revision_id || !entry.image_asset_id || !model.entries.includes(entry)) return
    const key = sceneEntryKey(entry)
    const imageRequest = (wordImageRequests.get(key) ?? 0) + 1
    wordImageRequests.set(key, imageRequest)
    wordImageStates.value[key] = WordImageStatus.LOADING
    entry.image_url = undefined
    /** 判断返回的签名是否仍属于当前页面和词条请求 */
    const current = () =>
      request === generation &&
      fullModel.value === model &&
      wordImageRequests.get(key) === imageRequest
    try {
      const resource = await runtime.scene.getResource(
        model.sceneId,
        entry.image_asset_id,
        model.revision_id
      )
      if (!current()) return
      entry.image_url = resource.url
      wordImageStates.value[key] = WordImageStatus.READY
    } catch (error) {
      if (!current()) return
      if ([401, 403].includes((error as HttpStatusCarrier)?.status ?? 0)) handleFailure(error)
      else wordImageStates.value[key] = WordImageStatus.FAILED
    }
  }
  /** 解析当前发布词汇图片，request 为页面代次 */
  const resolveWordImages = async (request: number) => {
    await Promise.all(
      (fullModel.value?.entries ?? [])
        .filter((entry) => entry.image_asset_id)
        .map((entry) => resolveWordImage(entry, request))
    )
  }
  /** 手动重签词汇图片，entry 为当前仍可访问的词条 */
  const retryWordImage = async (entry: SceneEntry) => {
    if (suspended || wordImageStates.value[sceneEntryKey(entry)] === WordImageStatus.LOADING) return
    await resolveWordImage(entry, generation)
  }
  if (getCurrentInstance())
    provide(WORD_IMAGE_CONTROLLER_KEY, { states: wordImageStates, retry: retryWordImage })

  /** 使用路由标识加载场景，id 为授权场景 ID，缺失时不猜测场景 */
  const initialize = async (id?: string) => {
    const token = analytics.capture()
    suspended = false
    const request = ++generation
    sheetRequest++
    audio.dispose()
    imageOpen.value = false
    imageUrl.value = ''
    imageRetried = false
    wordImageStates.value = {}
    wordImageRequests.clear()
    sceneId.value = id ?? ''
    if (!id) {
      scene.clear()
      return
    }
    await scene.load(runtime.scene, id)
    if (request !== generation) return
    const model = fullModel.value
    if (model && !opened.has(id)) {
      opened.add(id)
      analytics.track(
        AnalyticsEvent.SCENE_OPEN_SUCCESS,
        {
          content_scene_id: id,
          content_revision_id: model.revision_id
        },
        { token }
      )
    }
    await Promise.all([resolveImage(request), resolveWordImages(request)])
    void progressQueue.flush()
  }

  /** 播放固定版本音频，target 为整段资源或同资源的句子区间 */
  const play = async (target: AudioTarget) => {
    if (!fullModel.value) return
    const sentence = scene.dialogueEntries.find((entry) => entry.entry_id === target.sentence_id)
    if (sentence) savePosition({ entry_id: sentence.source_locator, offset: scrollTop.value })
    await audio.play(target, runtime.scene, audioOwner)
  }

  /** 从服务器获取词卡，entry 为列表引用，span 为点击位置绑定的版本和来源 */
  const inspectEntry = async (entry: SceneEntry, span?: ClickableSpan) => {
    const token = analytics.capture()
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
                  target_type: AudioTargetType.LEGACY_ENTRY,
                  scene_id: model.sceneId,
                  revision_id: model.revision_id
                }
              : undefined
        },
        position
      )
      analytics.track(
        AnalyticsEvent.ENTRY_POPUP_VIEW,
        {
          content_scene_id: model.sceneId,
          content_revision_id: model.revision_id,
          entry_type: entry.entry_type
        },
        { token }
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
    const request = generation
    const model = fullModel.value
    const matched = fullModel.value?.entries.find(
      (candidate) =>
        candidate.entry_id === span.entry_id && candidate.entry_type !== SceneEntryType.DIALOGUE
    )
    if (!matched) return
    const inspecting = inspectEntry(matched, span)
    const sheetGeneration = sheetRequest
    await inspecting
    if (request === generation && sheetGeneration === sheetRequest && fullModel.value === model)
      savePosition({ entry_id: entry.source_locator, offset: scrollTop.value })
  }

  /** 关闭弹层但保持当前滚动像素，不触发来源跳转 */
  const closeSheet = () => {
    sheetRequest++
    sheetLoading.value = false
    scene.closeSheet()
  }

  /** 切换当前义项来源收藏，entry 为同版确认条目，正文不参与写入 */
  const favorite = async (entry: SceneEntry) => {
    const token = analytics.capture()
    const model = fullModel.value
    const request = generation
    const reference = referenceFor(entry)
    if (!reference || !model || suspended) {
      uni.showToast({ icon: 'none', title: '请重新加载已确认内容后收藏' })
      return
    }
    const state = favorites.stateFor(reference)
    if (state.pending) return
    try {
      const removing = state.is_favorited && state.favorite_id
      if (removing) await favorites.remove(removing, runtime.favorites)
      else await favorites.create(reference, runtime.favorites)
      if (request !== generation || fullModel.value !== model) return
      entry.favorited = state.is_favorited
      entry.favorite_id = state.favorite_id
      if (!removing)
        analytics.track(
          AnalyticsEvent.FAVORITE_ADD_SUCCESS,
          {
            content_scene_id: model.sceneId,
            content_revision_id: model.revision_id,
            entry_type: entry.entry_type
          },
          { token, once: `${visitKey}:${model.sceneId}:${entry.entry_id}` }
        )
      uni.showToast({ icon: 'success', title: removing ? '已取消收藏' : '已收藏' })
    } catch (error) {
      if (request === generation && fullModel.value === model) {
        const status = (error as HttpStatusCarrier)?.status
        if (status === 409) uni.showToast({ icon: 'none', title: '内容已更新，请重新加载后收藏' })
        else handleFailure(error)
      }
    }
  }

  /** 保存稳定阅读位置，position 为最后可见句子及相对偏移 */
  const savePosition = (position: StablePosition) => {
    if (sceneId.value && !suspended && fullModel.value) {
      uni.setStorageSync(`juya.scene-position.${sceneId.value}`, {
        ...position,
        content_version: fullModel.value.content_version
      })
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
    const token = analytics.capture()
    const model = fullModel.value
    const request = generation
    if (completing || !model || suspended) return false
    completing = true
    try {
      await progressQueue.flush()
      if (request !== generation || fullModel.value !== model) return false
      await runtime.scene.complete(model.sceneId)
      if (request === generation && fullModel.value === model)
        analytics.track(
          AnalyticsEvent.LEARN_COMPLETE_SUCCESS,
          {
            content_scene_id: model.sceneId,
            content_revision_id: model.revision_id
          },
          { token, once: `${visitKey}:${model.sceneId}:${model.revision_id}` }
        )
      return request === generation && fullModel.value === model
    } catch (error) {
      if (request === generation && fullModel.value === model) handleFailure(error)
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
    audio.cancelOwned(audioOwner)
    void progressQueue.flush()
  }
  if (getCurrentScope())
    onScopeDispose(() => {
      suspended = true
      generation++
      sheetRequest++
      audio.cancelOwned(audioOwner)
    })

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
    pendingFavoriteIds,
    originalImageUrl,
    play,
    savePosition,
    scene,
    sceneId,
    scrollTarget,
    scrollTop,
    sheetLoading,
    wordImageStates,
    retryWordImage
  }
}
