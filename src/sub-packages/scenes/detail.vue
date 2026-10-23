<script setup lang="ts">
import { onHide, onLoad, onPageScroll, onShow, onUnload } from '@dcloudio/uni-app'
import { computed, ref, watch } from 'vue'

import AppLoading from '@/components/app-loading/app-loading.vue'
import AppPage from '@/components/app-page/app-page.vue'
import AppState from '@/components/app-state/app-state.vue'
import { useNativeShare } from '@/composables/use-native-share'
import { useReadingPosition } from '@/composables/use-reading-position'
import { useSceneDictionary } from '@/composables/use-scene-dictionary'
import { createAudioController } from '@/features/learning/audio-controller'
import SceneAudioPlayer from '@/features/learning/components/scene-audio-player.vue'
import SceneDialogue from '@/features/learning/components/scene-dialogue.vue'
import SceneDictionary from '@/features/learning/components/scene-dictionary.vue'
import SceneQueueEnd from '@/features/learning/components/scene-queue-end.vue'
import SceneSectionHeading from '@/features/learning/components/scene-section-heading.vue'
import SceneUnavailable from '@/features/learning/components/scene-unavailable.vue'
import SceneVocabulary from '@/features/learning/components/scene-vocabulary.vue'
import ShareSheet from '@/features/share/components/share-sheet.vue'
import ShareSummary from '@/features/share/components/share-summary.vue'
import { onSessionExpired, operations, session } from '@/services/api'
import { createAudioPort } from '@/services/audio-port'
import { clientThumbnail } from '@/services/client-thumbnail'
import { createDictionarySpeech } from '@/services/dictionary-service'
import { ApiError } from '@/services/errors'
import { createFullAudioPreparation } from '@/services/full-audio-preparation'
import { prepareImagePreviewSource, registerImagePreview } from '@/services/image-preview'
import { mediaAddress } from '@/services/media-service'
import { backTo } from '@/services/navigation'
import { operationKey, resourceURL, sendPublicRequest } from '@/services/platform'
import { loadPronunciation } from '@/services/pronunciation-service'
import { runtimeMode } from '@/services/runtime-mode'
import { sceneImageId, sceneThumbnailURL } from '@/services/scene-image'
import { prepareShareCover } from '@/services/share-cover-file'
import { parseShareTarget, shareTargetURL } from '@/services/share-service'
import {
  discardPreparedScene,
  prepareSourceScene,
  sourceQueue,
  takePreparedScene
} from '@/services/source-queue'
import { prepareAudioCacheFile, prepareWordAudioFile } from '@/services/word-audio-file'
import { createWordAudioPreparation, waitForWordAudio } from '@/services/word-audio-preparation'
import { Routes } from '@/shared/constants/navigation'
import { AudioStatus } from '@/shared/enums/audio'
import { QueueSource } from '@/shared/enums/learning'
import { ShareTarget } from '@/shared/enums/share'
import { useAccountStore } from '@/stores/account-store'
import { createShareService } from '@/sub-packages/scenes/scene-share-service'

import type { components } from '@/shared/contracts/generated/mini-api'
import type { AudioState } from '@/shared/types/audio'
import type { PublishedScene } from '@/shared/types/learning'
const account = useAccountStore(),
  card = ref<PublishedScene | null>(null),
  summary = ref<components['schemas']['PersonalSummary'] | null>(null),
  imageSrc = ref(''),
  imageError = ref(''),
  imageLoading = ref(false),
  imageKey = ref(0),
  busy = ref(false),
  error = ref(''),
  actionError = ref(''),
  message = ref(''),
  completionStatistics = ref<components['schemas']['Statistics'] | null>(null),
  favoriteBusy = ref(false),
  completeBusy = ref(false),
  awaitingState = ref(false),
  stale = ref(false),
  queueId = ref(''),
  queueSource = ref<QueueSource | null>(null),
  queueEnd = ref(false),
  nextBusy = ref(false),
  nextError = ref(''),
  reviewOnEntry = ref(false),
  dialogueView = ref<InstanceType<typeof SceneDialogue> | null>(null),
  vocabularyView = ref<InstanceType<typeof SceneVocabulary> | null>(null)
const browseOnly = runtimeMode.browseOnly,
  publicShare = createShareService({
    send: sendPublicRequest,
    resource: resourceURL,
    prepareImage: prepareShareCover
  }),
  share = useNativeShare(publicShare.friends, publicShare.timeline),
  homeSummary = ref(false)
let sharedEntry = false,
  requiresIdentityCheck = browseOnly.value
/** 点击后立即打开准备状态，复用当前场景和版本的公开分享请求 */
const openShare = () => {
  if (runtimeMode.update() || !visible || !card.value || stale.value) return
  share.show()
  void publicShare.prepare(id, card.value.version_id)
}
const audioState = ref<AudioState>({
  rate: 1,
  rateError: '',
  status: AudioStatus.IDLE,
  position: 0,
  duration: 0,
  error: '',
  wordId: null,
  wordStatus: AudioStatus.IDLE,
  wordError: ''
})
let id = '',
  alive = true,
  visible = true,
  generation = 0,
  audio: ReturnType<typeof createAudioController> | null = null,
  fullAudio: ReturnType<typeof createFullAudioPreparation> | null = null,
  wordAudio: ReturnType<typeof createWordAudioPreparation> | null = null,
  imageOpen = false,
  imageGeneration = 0,
  originalSrc = '',
  imageRequest: Promise<string> | null = null,
  releaseImage: (() => void) | null = null
const reading = useReadingPosition({
  scene: card,
  cardId: () => id,
  children: () => [dialogueView.value, vocabularyView.value]
})
const dictionary = useSceneDictionary({
  context: () =>
    !browseOnly.value && card.value && alive && visible && !stale.value && session.userId()
      ? { cardId: id, versionId: card.value.version_id, owner: session.userId()! }
      : null,
  request: session.request,
  prepareSpeech: (selection, active) =>
    createDictionarySpeech(selection, active, (reason) => {
      void invalid(reason)
    }),
  stopSpeech: (key) => audio?.stopWord(key),
  playSpeech: (key, load) => {
    createAudio()
    void audio?.playWord(key, load)
  },
  onFailure: (reason) => invalid(reason)
})
const images = computed(() =>
  imageSrc.value && !imageError.value ? [{ src: imageSrc.value, generation: imageKey.value }] : []
)
const favorite = computed(
  () => card.value?.state.favorite || summary.value?.state.favorite || false
)
const canAdvance = computed(() =>
  Boolean(
    card.value?.state.today_completed ||
    (queueSource.value === QueueSource.LEARNING && card.value?.state.completed)
  )
)
const completionLabel = computed(() => {
  if (canAdvance.value)
    return queueSource.value
      ? queueSource.value !== QueueSource.LEARNING && reviewOnEntry.value
        ? '复习下一张'
        : '继续学习下一张'
      : '前往学习页'
  return card.value?.state.completed ? '完成本次复习' : '已完成学习'
})
/** 反馈作为新的原生页面入栈，返回时保留当前译文和阅读实例 */
const feedback = () => {
  if (card.value && !stale.value)
    uni.navigateTo({
      url: `${Routes.FEEDBACK_CREATE}?card_id=${encodeURIComponent(id)}&version_id=${encodeURIComponent(card.value.version_id)}`
    })
}
/** 返回建立本次快照的原生来源栈，无栈时回到相应列表 */
const returnSource = () =>
  backTo(
    queueSource.value === QueueSource.FAVORITES
      ? Routes.FAVORITES
      : queueSource.value === QueueSource.RECORDS || queueSource.value === QueueSource.DAY
        ? Routes.RECORDS
        : Routes.LEARNING
  )
/** 结束或直接单卡完成后回到学习入口 */
const learn = () => uni.switchTab({ url: Routes.LEARNING })
/** 检查持久待确认完成，换页面或重新显示不能绕过原操作查询 */
const checkPendingCompletion = () => {
  const pending = operations.pending(`complete:${id}`)
  awaitingState.value = pending
  if (pending) actionError.value = '上次完成结果待确认，请先查询结果'
  return pending
}
/** 进入当前场景时创建两路互斥音频，不自动播放 */
const createAudio = () => {
  if (runtimeMode.update() || audio || !visible || !card.value || stale.value) return
  const current = card.value,
    owner = account.profile,
    userId = session.userId()
  const full = createAudioPort(),
    word = createAudioPort()
  const player = createAudioController(
    full,
    word,
    (state) => {
      if (alive) audioState.value = state
    },
    undefined,
    (wordId) => {
      wordAudio?.invalidate(wordId)
      dictionary.invalidateSpeech(wordId)
    },
    () => fullAudio?.invalidate()
  )
  audio = player
  /** 确认两个准备任务仍属于当前页面、会话和发布版本 */
  const active = () =>
    alive &&
    audio === player &&
    account.profile === owner &&
    session.userId() === userId &&
    card.value?.version_id === current.version_id &&
    !stale.value
  /** 仅处理服务端确认的失效，后台网络失败不打断正文
   * @param reason 地址请求或下载得到的访问错误
   */
  const onFailure = (reason: unknown) => {
    if (reason instanceof ApiError && reason.status === 401) {
      stopAudio()
      void account.restore().catch(() => undefined)
    } else void invalid(reason)
  }
  if (current.content.audio_id) {
    const audioId = current.content.audio_id
    fullAudio = createFullAudioPreparation({
      active,
      resolve: () => mediaAddress(id, audioId, current.version_id, false, true),
      download: prepareAudioCacheFile,
      prepared: player.prepareFull,
      onFailure
    })
  }
  wordAudio = createWordAudioPreparation({
    active,
    resolve: async (wordId, task) => {
      const path = `/api/mini/v1/cards/${encodeURIComponent(id)}/words/${encodeURIComponent(wordId)}/pronunciation`
      const url = await loadPronunciation(
        {
          active: task.active,
          pause: (milliseconds) => waitForWordAudio(milliseconds, task),
          request: (method, path, reference) =>
            session.request<components['schemas']['SpeechState']>(
              method === 'GET'
                ? `${path}?version_id=${encodeURIComponent(reference.version_id || '')}`
                : path,
              method === 'POST' ? { method, key: operationKey(), body: reference } : {}
            )
        },
        path,
        { version_id: current.version_id }
      )
      return resourceURL(url)
    },
    download: prepareWordAudioFile,
    onFailure
  })
  audio.state.duration = card.value.audio_duration || 0
  audioState.value = { ...audio.state }
  fullAudio?.prefetch()
  wordAudio.prefetch(
    (current.content.vocabulary || []).flatMap((word) => (word.id ? [word.id] : []))
  )
}
/** 离开场景时先停止播放器，再取消准备任务和释放临时音频 */
const stopAudio = () => {
  dictionary.close()
  audio?.dispose()
  audio = null
  fullAudio?.dispose()
  fullAudio = null
  wordAudio?.dispose()
  wordAudio = null
}
const releaseAudioSession = onSessionExpired(stopAudio)
watch(() => account.profile, stopAudio)
/** 真实下线、删除或版本变化后关闭可操作正文
 * @param reason 服务端已确认的访问错误
 */
const invalid = async (reason: unknown) => {
  if (!(reason instanceof ApiError)) return
  if (reason.status === 409) {
    publicShare.clear()
    share.hide()
    stale.value = true
    stopAudio()
    actionError.value = '内容已更新，请刷新后继续'
    return
  }
  if (reason.status !== 410) return
  publicShare.clear()
  share.hide()
  const previous = card.value
  card.value = null
  imageSrc.value = ''
  stopAudio()
  summary.value = {
    id,
    name: previous?.content.name || '这张场景卡',
    title_en: previous?.content.title_en || '',
    thumbnail_id: null,
    available: false,
    version_id: null,
    unavailable_reason: reason.code === 'card_deleted' ? 'deleted' : 'offline',
    state: previous?.state || {
      completed: false,
      today_completed: false,
      favorite: false,
      started: false
    }
  }
  try {
    const value = await session.request<components['schemas']['PersonalSummary']>(
      `/api/mini/v1/cards/${id}/summary`
    )
    if (alive) summary.value = value
  } catch {
    /* A learner without a previous favorite/completion only keeps the already-known safe label */
  }
}
/** 查看时优先复用完整原图，缩图处理失败也可独立加载原图
 * @param renew 用户主动重试原图时重新签发地址
 */
const resolveImage = (renew = false): Promise<string> => {
  const scene = card.value,
    run = generation,
    imageId = sceneImageId(scene?.thumbnail_id, scene?.content.image_id, true)
  if (!scene || !imageId || stale.value || !alive)
    return Promise.reject(new Error('场景图片暂不可用'))
  if (!renew && originalSrc) return Promise.resolve(originalSrc)
  if (imageRequest) return imageRequest
  originalSrc = ''
  const request = mediaAddress(id, imageId, scene.version_id, false, renew)
    .then(prepareImagePreviewSource)
    .then((value) => {
      if (
        !alive ||
        run !== generation ||
        card.value?.version_id !== scene.version_id ||
        stale.value
      )
        throw new Error('场景版本已变化，请重新打开图片')
      originalSrc = value
      return value
    })
    .finally(() => {
      if (imageRequest === request) imageRequest = null
    })
  imageRequest = request
  return request
}
/** 优先加载已有缩略图，缺失时读取原图并在前端等比缩小
 * @param renew 用户重试时是否更新资源凭证
 */
const loadImage = async (renew = false) => {
  const scene = card.value,
    thumbnailId = sceneImageId(scene?.thumbnail_id),
    imageId = sceneImageId(scene?.thumbnail_id, scene?.content.image_id, true)
  if (!scene || (!thumbnailId && !imageId) || imageLoading.value || stale.value || !alive) return
  const run = ++imageGeneration,
    version = scene.version_id
  imageLoading.value = true
  imageKey.value = run
  imageError.value = ''
  imageSrc.value = ''
  try {
    if (thumbnailId) {
      const value = await mediaAddress(id, thumbnailId, version, false, renew).then(
        sceneThumbnailURL
      )
      if (alive && run === imageGeneration && card.value?.version_id === version && !stale.value)
        imageSrc.value = value
    } else {
      const result = await clientThumbnail(
        JSON.stringify([session.userId(), id, version]),
        () => mediaAddress(id, imageId, version, false, renew),
        renew
      )
      if (alive && run === imageGeneration && card.value?.version_id === version && !stale.value) {
        imageSrc.value = result.thumbnailSrc
        originalSrc = result.originalSrc
      }
    }
  } catch (reason) {
    if (!alive || run !== imageGeneration || card.value?.version_id !== version) return
    imageLoading.value = false
    if (reason instanceof ApiError && [409, 410].includes(reason.status)) await invalid(reason)
    else imageError.value = '图片暂未加载，可重试'
  }
}
/** 同一详情图片的像素完成，run 为该图片建立时的请求代次 */
const imageLoaded = (run: number) => {
  if (alive && run === imageGeneration) imageLoading.value = false
}
/** 同一详情图片的像素失败，run 为该图片建立时的请求代次 */
const imageFailed = (run: number) => {
  if (!alive || run !== imageGeneration) return
  imageLoading.value = false
  imageError.value = '图片暂未加载，可重试'
}
/** 读取当前不可变发布内容，草稿不会进入详情 */
const load = async () => {
  if (runtimeMode.update()) {
    if (!homeSummary.value) await publicShare.prepare(id)
    return
  }
  if (busy.value) return
  publicShare.clear()
  share.close()
  busy.value = true
  message.value = ''
  completionStatistics.value = null
  error.value = ''
  actionError.value = ''
  stale.value = false
  const run = ++generation
  try {
    const target = sharedEntry
      ? shareTargetURL({ target: ShareTarget.SCENE, id })
      : `${Routes.SCENE}?id=${encodeURIComponent(id)}`
    if (!(await account.ensure(target))) return
    const revalidate = sharedEntry || requiresIdentityCheck
    if (revalidate && !(await account.restore())) return
    const value =
      (!requiresIdentityCheck && takePreparedScene(queueId.value, id)) ||
      (await session.request<PublishedScene>(`/api/mini/v1/cards/${id}`))
    if (!alive || run !== generation) return
    stopAudio()
    requiresIdentityCheck = false
    card.value = value
    reviewOnEntry.value = value.state.completed
    if (value.state.today_completed) message.value = '今日已完成学习'
    imageSrc.value = ''
    imageError.value = ''
    imageLoading.value = false
    imageGeneration++
    originalSrc = ''
    imageRequest = null
    summary.value = null
    checkPendingCompletion()
    createAudio()
    void loadImage()
    void reading.restore(value)
    if (visible) void publicShare.prepare(id, value.version_id)
  } catch (reason) {
    if (!alive || run !== generation) return
    if (reason instanceof ApiError && reason.status === 410) await invalid(reason)
    else error.value = reason instanceof Error ? reason.message : '场景暂未获取'
  } finally {
    if (alive && run === generation) busy.value = false
  }
}
/** 请求操作后的当前日期状态，不把午夜前的重放结果当成今天完成 */
const refreshState = async () => {
  if (runtimeMode.update()) return
  if (!card.value) return
  const version = card.value.version_id
  const value = await session.request<PublishedScene>(
    `/api/mini/v1/cards/${id}?version_id=${encodeURIComponent(version)}`
  )
  if (alive && card.value?.version_id === version) {
    card.value.state = value.state
    checkPendingCompletion()
  }
}
/** 已准备好的完整音频同步播放，提前点击只等待受控地址 */
const playFull = () => {
  if (runtimeMode.update()) return
  if (!card.value || stale.value) return
  createAudio()
  const prepared = fullAudio
  if (prepared) void audio?.toggleFull(() => prepared.load())
}
/** 已准备的词汇同步从本地播放，未完成时复用当前任务
 * @param wordId 当前发布版本中的词汇编号
 */
const playWord = (wordId: string) => {
  if (runtimeMode.update()) return
  if (!card.value || stale.value) return
  createAudio()
  const prepared = wordAudio
  if (prepared) void audio?.playWord(wordId, () => prepared.load(wordId))
}
/** 原图作为全屏覆盖页进入原生栈，系统返回只关闭覆盖层 */
const previewImage = () => {
  if (runtimeMode.update()) return
  if (!card.value?.content.image_id || stale.value) return
  imageOpen = true
  releaseImage?.()
  releaseImage = registerImagePreview({
    cardId: id,
    versionId: card.value.version_id,
    imageId: card.value.content.image_id,
    title: card.value.content.name,
    initialSrc: originalSrc,
    loadSource: resolveImage,
    onInvalid: (reason) => {
      void invalid(reason)
    },
    onClose: () => {
      imageOpen = false
    }
  })
  uni.navigateTo({
    url: `/sub-packages/scenes/image-preview?id=${encodeURIComponent(id)}`,
    fail: () => {
      imageOpen = false
      releaseImage?.()
    }
  })
}
/** 收藏或取消只改变整卡关联，未知响应保留原状态 */
const toggleFavorite = async () => {
  if (runtimeMode.update()) return
  if (favoriteBusy.value || stale.value) return
  favoriteBusy.value = true
  actionError.value = ''
  try {
    if (favorite.value) {
      await operations.run(`favorite:${id}`, `/api/mini/v1/favorites/${id}`, 'DELETE')
      if (card.value) card.value.state.favorite = false
      if (summary.value) {
        summary.value.state.favorite = false
        message.value = '已取消收藏'
      }
    } else if (card.value) {
      await operations.run(`favorite:${id}`, `/api/mini/v1/cards/${id}/favorite`, 'PUT', {
        version_id: card.value.version_id
      })
      await refreshState()
    }
  } catch (reason) {
    await invalid(reason)
    actionError.value = reason instanceof Error ? reason.message : '收藏暂未成功，请重试'
  } finally {
    favoriteBusy.value = false
  }
}
/** 完成查实后只预查后续资格，最后一张立即显示本次范围结束 */
const probeQueueEnd = async () => {
  if (!queueSource.value || !card.value || !canAdvance.value || awaitingState.value || !alive)
    return
  try {
    if (!sourceQueue.matches(queueId.value, id))
      throw new Error('本次来源已失效，请返回列表重新进入')
    const candidate = await sourceQueue.next()
    if (alive && !candidate) queueEnd.value = true
  } catch (reason) {
    if (alive) nextError.value = reason instanceof Error ? reason.message : '下一张暂未确认，请重试'
  }
}
/** 主动确认完成或复习，服务器成功后再读取可信统计 */
const complete = async () => {
  if (runtimeMode.update()) return
  if (checkPendingCompletion()) return
  if (
    !card.value ||
    card.value.state.today_completed ||
    completeBusy.value ||
    awaitingState.value ||
    stale.value
  )
    return
  completeBusy.value = true
  actionError.value = ''
  message.value = ''
  completionStatistics.value = null
  try {
    await operations.run<components['schemas']['CompletionResponse']>(
      `complete:${id}`,
      `/api/mini/v1/cards/${id}/complete`,
      'POST',
      { version_id: card.value.version_id }
    )
    awaitingState.value = true
    message.value = '已计入学习记录'
    const results = await Promise.allSettled([refreshState(), account.refreshStatistics()])
    if (results[1].status === 'fulfilled') completionStatistics.value = account.statistics
    else message.value = '已计入学习记录，统计暂未更新'
    if (results[0].status === 'rejected') {
      await invalid(results[0].reason)
      actionError.value = '学习记录已保存，当前状态暂未更新，请刷新确认'
    } else await probeQueueEnd()
  } catch (reason) {
    await invalid(reason)
    awaitingState.value = operations.pending(`complete:${id}`)
    actionError.value = reason instanceof Error ? reason.message : '完成结果暂未确认，请查询或重试'
  } finally {
    completeBusy.value = false
  }
}
/** 查询本人待确认操作，成功后刷新当前状态，不能自行补记日期 */
const recover = async () => {
  if (runtimeMode.update()) return
  actionError.value = ''
  try {
    for (const action of [`complete:${id}`, `favorite:${id}`]) {
      if (operations.pending(action)) await operations.recover(action)
    }
    if (card.value) await refreshState()
    await account.refreshStatistics()
    await probeQueueEnd()
  } catch (reason) {
    await invalid(reason)
    actionError.value = reason instanceof Error ? reason.message : '暂未确认结果，可重试原操作'
  }
}
/** 先核对当前真实状态再推进来源，分页失败保留当前详情 */
const advance = async () => {
  if (runtimeMode.update()) return
  if (checkPendingCompletion()) return
  if (nextBusy.value || completeBusy.value || awaitingState.value || stale.value || !card.value)
    return
  if (!queueSource.value) {
    learn()
    return
  }
  nextBusy.value = true
  nextError.value = ''
  try {
    try {
      await refreshState()
    } catch (reason) {
      await invalid(reason)
      throw reason
    }
    if (!canAdvance.value || !alive) return
    if (!sourceQueue.matches(queueId.value, id))
      throw new Error('本次来源已失效，请返回列表重新进入')
    const nextId = await sourceQueue.next()
    if (!alive) return
    if (!nextId) {
      queueEnd.value = true
      return
    }
    await reading.save()
    const nextScene = await session.request<PublishedScene>(
      `/api/mini/v1/cards/${encodeURIComponent(nextId)}`
    )
    if (!alive) return
    const rollback = sourceQueue.commit(nextId)
    prepareSourceScene(queueId.value, nextScene)
    try {
      await new Promise<void>((resolve, reject) =>
        uni.redirectTo({
          url: `${Routes.SCENE}?id=${encodeURIComponent(nextId)}&queue=${encodeURIComponent(queueId.value)}`,
          success: () => resolve(),
          fail: () => reject(new Error('下一张暂未打开，请重试'))
        })
      )
    } catch (reason) {
      rollback()
      discardPreparedScene()
      throw reason
    }
  } catch (reason) {
    nextError.value = reason instanceof Error ? reason.message : '下一张暂未获取，请重试'
  } finally {
    nextBusy.value = false
  }
}
/** 完成和导航各自只处理一次操作，今日已完成不重复提交 */
const primaryAction = () => {
  if (canAdvance.value) void advance()
  else void complete()
}
onLoad((query) => {
  runtimeMode.update()
  const target = parseShareTarget(query || {})
  if (query?.target && (!target || target.target === ShareTarget.LEARNING)) {
    homeSummary.value = true
    if (!browseOnly.value) learn()
    return
  }
  sharedEntry = target?.target === ShareTarget.SCENE
  id = String(query?.id || '')
  queueId.value = sharedEntry ? '' : String(query?.queue || '')
  if (sourceQueue.matches(queueId.value, id)) queueSource.value = sourceQueue.source()
  if (!/^[A-Za-z0-9-]{1,64}$/.test(id)) {
    error.value = '未找到这张场景卡'
    return
  }
  void load()
})
onShow(() => {
  visible = true
  if (runtimeMode.update()) {
    if (visible && !homeSummary.value && id) void publicShare.prepare(id)
    return
  }
  if (card.value) {
    createAudio()
    void refreshState().catch(invalid)
    void publicShare.prepare(id, card.value.version_id, true)
  }
})
watch(
  browseOnly,
  (restricted) => {
    share.hide()
    publicShare.clear()
    if (restricted) {
      requiresIdentityCheck = true
      generation++
      imageGeneration++
      reading.dispose()
      stopAudio()
      card.value = null
      summary.value = null
      imageSrc.value = ''
      originalSrc = ''
      busy.value = false
      if (visible && !homeSummary.value && id) void publicShare.prepare(id)
    } else if (homeSummary.value) learn()
    else if (id) void load()
  },
  { flush: 'sync' }
)
onPageScroll((event) => reading.scroll(event.scrollTop))
onHide(() => {
  visible = false
  share.hide()
  publicShare.clear()
  if (!runtimeMode.update()) void reading.save()
  if (!imageOpen) {
    stopAudio()
  }
})
onUnload(() => {
  share.hide()
  publicShare.clear()
  if (!runtimeMode.update()) void reading.save()
  reading.dispose()
  alive = false
  visible = false
  generation++
  stopAudio()
  releaseAudioSession()
  releaseImage?.()
})
</script>
<template>
  <AppPage
    :title="summary ? '场景卡暂不可用' : '场景学习'"
    :back="!browseOnly"
    :footer="!browseOnly"
    public-summary
    :shareable="!browseOnly && Boolean(card) && !stale && publicShare.ready.value"
    :share-channels="{
      friends: publicShare.channels.friends.ready,
      timeline: publicShare.channels.timeline.ready
    }"
    ><ShareSummary
      v-if="browseOnly"
      :summary="homeSummary ? null : publicShare.summary.value"
      :image="
        homeSummary || !publicShare.channels.timeline.ready ? '' : publicShare.timeline().imageUrl
      "
      :busy="!homeSummary && publicShare.busy.value"
      :error="homeSummary ? '' : publicShare.error.value || error"
      @retry="load"
    />
    <template v-else
      ><AppState :busy="busy && !card" :error="error" @retry="load" /><template v-if="stale"
        ><view class="notice">内容已更新，请重新获取后继续学习</view
        ><button class="primary" @click="load">刷新内容</button></template
      ><SceneUnavailable
        v-else-if="summary"
        :summary="summary"
        :favorite-busy="favoriteBusy"
        :message="message"
        :shared-entry="sharedEntry"
        @unfavorite="toggleFavorite" /><template v-else-if="card"
        ><view v-if="reading.notice.value" class="notice">{{ reading.notice.value }}</view
        ><view class="reading-anchor" data-reading-anchor="top"
          ><view class="scene-title between"
            ><text class="title">{{ card.content.name }}</text
            ><button
              class="favorite"
              :class="{ saved: favorite }"
              :disabled="favoriteBusy"
              :aria-pressed="favorite"
              @click="toggleFavorite"
            >
              <AppLoading v-if="favoriteBusy" compact label="正在更新收藏" icon-only /><image
                v-else
                class="favorite-icon"
                src="/static/design/heart.svg"
                mode="aspectFit"
                aria-hidden="true"
              /><text>{{ favoriteBusy ? '处理中' : favorite ? '已收藏' : '收藏整卡' }}</text>
            </button></view
          ><text v-if="card.content.title_en" class="scene-english">{{
            card.content.title_en
          }}</text
          ><view class="scene-picture">
            <view class="scene-thumbnail" @click="previewImage">
              <image
                v-for="image in images"
                :key="image.generation"
                :src="image.src"
                mode="aspectFit"
                :webp="true"
                :alt="card.content.name"
                @load="imageLoaded(image.generation)"
                @error="imageFailed(image.generation)"
              />
              <text v-if="!card.thumbnail_id && !card.content.image_id" class="image-retry"
                >暂无场景图</text
              >
              <button v-else-if="imageError" class="image-retry" @click.stop="loadImage(true)">
                {{ imageError }}
              </button>
              <view v-if="imageLoading" class="image-loading"
                ><AppLoading compact label="正在加载场景图"
              /></view>
            </view>
            <view class="scene-prompt">
              <text class="prompt-title">Start with the scene.</text>
              <text class="prompt-description">点开场景卡，查看完整图片。</text>
              <button class="expand-image" @click="previewImage">放大场景卡</button>
            </view>
          </view>
          <SceneAudioPlayer
            :state="audioState"
            @toggle="playFull"
            @seek="audio?.seekFull($event)"
            @rate="audio?.setRate($event)" /></view
        ><SceneDialogue
          ref="dialogueView"
          :key="`${id}:${card.version_id}`"
          :dialogue="card.content.dialogue || []"
          :vocabulary="card.content.vocabulary || []"
          @layout="reading.refresh"
          @lookup="dictionary.open"
        />
        <SceneVocabulary
          ref="vocabularyView"
          :vocabulary="card.content.vocabulary || []"
          :dialogue="card.content.dialogue || []"
          :state="audioState"
          :disabled="stale"
          @play="playWord"
        />
        <view v-if="card.content.chunks?.length" class="chunks-section"
          ><SceneSectionHeading english="Useful expressions" chinese="实用语块" /><view
            v-for="chunk in card.content.chunks"
            :key="chunk.id"
            class="word reading-anchor"
            :data-reading-anchor="chunk.id ? `chunk:${chunk.id}` : undefined"
            ><text class="word-english">{{ chunk.english }}</text
            ><text class="meaning">{{ chunk.chinese }}</text></view
          ></view
        ><view class="detail-tools"
          ><button class="text-button" @click="feedback">
            <image
              src="/static/design/feedback-message.svg"
              mode="aspectFit"
              aria-hidden="true"
            />反馈问题</button
          ><button class="text-button" :disabled="stale" @click="openShare">
            <image src="/static/design/share.svg" mode="aspectFit" aria-hidden="true" />分享场景
          </button></view
        ><view v-if="message" class="notice success"
          >{{ message
          }}<text v-if="completionStatistics">
            · 已学 {{ completionStatistics.completed_cards }} 张，连续
            {{ completionStatistics.current_streak }} 天</text
          ></view
        ></template
      ><view v-if="actionError" class="notice error"
        >{{ actionError }}<button class="text-button" @click="recover">查询并刷新状态</button></view
      ><view v-if="nextError" class="notice error" role="alert"
        >{{ nextError }}<button class="text-button" @click="advance">重试下一张</button
        ><button class="text-button" @click="returnSource">返回来源列表</button></view
      ><SceneDictionary
        v-if="dictionary.selection.value"
        :selection="dictionary.selection.value"
        :result="dictionary.result.value"
        :busy="dictionary.busy.value"
        :error="dictionary.error.value"
        :voice-status="
          audioState.wordId === dictionary.speechKey.value
            ? audioState.wordStatus
            : AudioStatus.IDLE
        "
        :voice-error="audioState.wordId === dictionary.speechKey.value ? audioState.wordError : ''"
        @close="dictionary.close"
        @retry="dictionary.retry"
        @play="dictionary.play" /><SceneQueueEnd
        v-if="queueEnd"
        :source="queueSource"
        @learn="learn"
        @stay="queueEnd = false" /><ShareSheet
        v-if="share.open.value"
        scene
        :friends="publicShare.friends()"
        :timeline="publicShare.timeline()"
        :channels="publicShare.channels"
        :summary-busy="publicShare.summaryBusy.value"
        :error="publicShare.error.value"
        @retry="publicShare.retry"
        @close="share.close" /></template
    ><template #footer
      ><view v-if="card && !stale" class="safe-footer"
        ><button
          class="primary"
          :disabled="completeBusy || nextBusy || awaitingState || busy"
          :loading="completeBusy || nextBusy"
          @click="primaryAction"
        >
          {{
            nextBusy ? '正在加载下一张…' : awaitingState ? '结果待确认，请先查询' : completionLabel
          }}
        </button></view
      ></template
    ></AppPage
  >
</template>
<style scoped lang="scss">
.detail-tools {
  display: flex;
  justify-content: space-between;
  border-top: 1px solid #dfe5d8;
  margin-top: 38.462rpx;
  padding-top: 38.462rpx;

  button {
    min-height: 76.923rpx;
    padding: 17.308rpx 11.538rpx;
    gap: 13.462rpx;
    font-size: 26.923rpx;
  }

  image {
    width: 38.462rpx;
    height: 38.462rpx;
  }
}

.scene-title {
  align-items: flex-start;
  gap: 19.231rpx;
  margin-bottom: 23.077rpx;

  .title {
    flex: 1;
    min-width: 0;
    font-size: 34.615rpx;
    line-height: 1.6;
    font-weight: 500;
    overflow-wrap: anywhere;
  }

  .favorite {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 11.538rpx;
    border: 0;
    border-radius: 0;
    background: none;
    padding: 5.769rpx 0 5.769rpx 9.615rpx;
    min-height: 61.538rpx;
    color: #2b4438;
    font-size: 21.154rpx;

    .favorite-icon {
      width: 36.538rpx;
      height: 36.538rpx;
    }

    &.saved {
      color: #ad4f32;
    }
  }
}

.scene-english {
  display: block;
  font-family: Fraunces, Georgia, serif;
  font-size: 42.308rpx;
  line-height: 1.42;
  margin-bottom: 53.846rpx;
  overflow-wrap: anywhere;
}

.scene-picture {
  display: flex;
  align-items: center;
  gap: 34.615rpx;
  padding: 30.769rpx;
  border: 1px solid #dfe5d8;
  border-radius: 25rpx;
  background: #fff;

  .scene-thumbnail {
    position: relative;
    width: 176.923rpx;
    height: 269.231rpx;
    flex-shrink: 0;
    overflow: hidden;
    border-radius: 7.692rpx;
  }

  image {
    display: block;
    width: 100%;
    height: 100%;
  }

  .image-retry {
    height: 100%;
    width: 100%;
    background: #f0f4e8;
    border: 0;
    color: #586c5b;
    font-size: 21.154rpx;
    padding: 11.538rpx;
    line-height: 1.8;
  }

  .image-loading {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #586c5b;
    background: #e4f0db;
    font-size: 21.154rpx;
    text-align: center;

    :deep(.app-loading) {
      flex-direction: column;
    }
  }

  .scene-prompt {
    flex: 1;
    min-width: 0;
  }

  .prompt-title {
    display: block;
    font-family: Fraunces, Georgia, serif;
    font-size: 38.462rpx;
    line-height: 1.35;
    font-weight: 400;
    letter-spacing: -0.02em;
    margin-bottom: 17.308rpx;
  }

  .prompt-description {
    display: block;
    font-size: 21.154rpx;
    line-height: 1.8;
    margin-bottom: 19.231rpx;
    color: #586c5b;
  }

  .expand-image {
    display: inline-flex;
    border: 1px solid #dfe5d8;
    background: #fff;
    border-radius: 19.231rpx;
    padding: 17.308rpx 19.231rpx;
    font-size: 23.077rpx;
    line-height: 1.5;
    min-height: 76.923rpx;
  }
}

.chunks-section {
  margin-top: 57.692rpx;
}

.word {
  padding: 26.923rpx 0;
  border-bottom: 1px solid #dfe5d8;

  .word-english {
    display: block;
    font-size: 38.462rpx;
    font-weight: 500;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }

  .meaning {
    display: block;
    font-size: 30.769rpx;
    margin-top: 9.615rpx;
    overflow-wrap: anywhere;
    line-height: 1.8;
    color: #ad4f32;
  }
}

.success {
  margin-top: 46.154rpx;
}
</style>
