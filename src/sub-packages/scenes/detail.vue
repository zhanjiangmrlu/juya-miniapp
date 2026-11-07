<script setup lang="ts">
import {
  onHide,
  onLoad,
  onPageScroll,
  onShareAppMessage,
  onShareTimeline,
  onShow,
  onUnload
} from '@dcloudio/uni-app'
import { computed, nextTick, ref, watch } from 'vue'

import AppLoading from '@/components/app-loading/app-loading.vue'
import AppPage from '@/components/app-page/app-page.vue'
import AppState from '@/components/app-state/app-state.vue'
import { useNativeShare } from '@/composables/use-native-share'
import SceneAudioPlayer from '@/features/learning/components/scene-audio-player.vue'
import SceneDictionary from '@/features/learning/components/scene-dictionary.vue'
import { dictionaryTokens } from '@/features/learning/scene-model'
import ShareSheet from '@/features/share/components/share-sheet.vue'
import ShareSummary from '@/features/share/components/share-summary.vue'
import { onSessionExpired, operations, session } from '@/services/api'
import { createAudioController } from '@/services/audio-controller'
import { createAudioPort } from '@/services/audio-port'
import { clientThumbnail } from '@/services/client-thumbnail'
import { ApiError } from '@/services/errors'
import { createFullAudioPreparation } from '@/services/full-audio-preparation'
import { promptLogin } from '@/services/login-prompt'
import { loginReturn } from '@/services/login-return'
import { clearMediaAddresses, mediaAddress } from '@/services/media-service'
import { backTo } from '@/services/navigation'
import { operationKey, resourceURL, sendPublicRequest } from '@/services/platform'
import { loadPronunciation } from '@/services/pronunciation-service'
import { runtimeMode } from '@/services/runtime-mode'
import { sceneImageId, sceneThumbnailURL } from '@/services/scene-image'
import { prepareShareCover } from '@/services/share-cover-file'
import { parseShareTarget } from '@/services/share-service'
import {
  discardPreparedScene,
  prepareSourceScene,
  sourceQueue,
  takePreparedScene
} from '@/services/source-queue'
import { prepareAudioCacheFile, prepareWordAudioFile } from '@/services/word-audio-file'
import { createWordAudioPreparation, waitForWordAudio } from '@/services/word-audio-preparation'
import { DICTIONARY_PREFETCH_SCROLL_DELAY_MS } from '@/shared/constants/dictionary'
import { Routes } from '@/shared/constants/navigation'
import { AudioStatus } from '@/shared/enums/audio'
import { QueueSource } from '@/shared/enums/learning'
import { LearningAccessReason } from '@/shared/enums/learning-access'
import { ShareTarget } from '@/shared/enums/share'
import { useAccountStore } from '@/stores/account-store'
import { createAccessMonitor } from '@/sub-packages/scenes/access-monitor'
import SceneDialogue from '@/sub-packages/scenes/components/scene-dialogue.vue'
import SceneQueueEnd from '@/sub-packages/scenes/components/scene-queue-end.vue'
import SceneSectionHeading from '@/sub-packages/scenes/components/scene-section-heading.vue'
import SceneUnavailable from '@/sub-packages/scenes/components/scene-unavailable.vue'
import SceneVocabulary from '@/sub-packages/scenes/components/scene-vocabulary.vue'
import { createDictionarySpeechCache } from '@/sub-packages/scenes/dictionary-service'
import {
  prepareImagePreviewSource,
  registerImagePreview
} from '@/sub-packages/scenes/image-preview-service'
import { createShareService } from '@/sub-packages/scenes/scene-share-service'
import { createStudyNote } from '@/sub-packages/scenes/study-note'
import { downloadStudyNote, openStudyNoteDocument } from '@/sub-packages/scenes/study-note-platform'
import { useReadingPosition } from '@/sub-packages/scenes/use-reading-position'
import { useSceneDictionary } from '@/sub-packages/scenes/use-scene-dictionary'

import type { components } from '@/shared/contracts/generated/mini-api'
import type { AudioState } from '@/shared/types/audio'
import type {
  DictionarySelection,
  DictionarySpeechCache,
  DictionaryToken
} from '@/shared/types/dictionary'
import type { PublishedScene } from '@/shared/types/learning'
import type { LoginSnapshot } from '@/shared/types/navigation'
const account = useAccountStore(),
  accessError = ref(''),
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
  share = useNativeShare(),
  homeSummary = ref(false)
// 原生分享属于编译期可选生命周期，必须直接在页面声明
onShareAppMessage(() => ({ ...publicShare.friends() }))
onShareTimeline(() => ({ ...publicShare.timeline() }))
let noteBodyRefresh = false,
  noteIntent = false,
  noteRecovery = false,
  sharedEntry = false,
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
  pageIdentity = session.identity(),
  audio: ReturnType<typeof createAudioController> | null = null,
  fullAudio: ReturnType<typeof createFullAudioPreparation> | null = null,
  fullAudioBackgroundPending = false,
  backgroundFull = false,
  audioClickGeneration = 0,
  wordAudio: ReturnType<typeof createWordAudioPreparation> | null = null,
  dictionaryAudio: DictionarySpeechCache | null = null,
  dictionaryReferences: DictionarySelection[] = [],
  dictionaryScrollTimer: ReturnType<typeof setTimeout> | undefined,
  dictionaryMeasuring = false,
  dictionaryMeasureRequested: DictionarySpeechCache | null = null,
  scrollTop = 0,
  imageOpen = false,
  restoringSnapshot: LoginSnapshot | null = null,
  imageGeneration = 0,
  originalSrc = '',
  imageRequest: Promise<string> | null = null,
  releaseImage: (() => void) | null = null
/** 暂停全部场景发音并撤销迟到点击，保留当前播放器和真实阅读状态 */
const pauseForNote = () => {
  audioClickGeneration++
  audio?.suspend()
  wordAudio?.cancelSelection()
  dictionary.cancelSpeech()
  dictionary.close()
}
const note = createStudyNote({
  userId: session.identity,
  context: () =>
    alive && card.value && !stale.value
      ? {
          cardId: id,
          bodyVersion: card.value.version_id,
          noteVersion: card.value.study_note?.version_id
        }
      : null,
  ensure: async () => !runtimeMode.update(),
  request: session.contentRequest,
  refreshBody: async () => {
    noteBodyRefresh = true
    try {
      await load()
    } finally {
      noteBodyRefresh = false
    }
  },
  resource: resourceURL,
  pause: pauseForNote,
  accept: (value) => {
    if (card.value?.version_id === value.version_id) card.value.study_note = value.study_note
  },
  download: downloadStudyNote,
  open: openStudyNoteDocument,
  invalid: (reason) => {
    if (reason instanceof ApiError && reason.status !== 409) void invalid(reason)
  }
})
/** 主动打开当前笔记，平台错误在标题区原位展示 */
const openNote = () => {
  if (!runtimeMode.update() && visible) void note.open()
}
const reading = useReadingPosition({
  scene: card,
  cardId: () => id,
  children: () => [dialogueView.value, vocabularyView.value]
})
/** H5页面可见时接收实际滚动输入，覆盖焦点位于页面外层时的键盘和滚轮 */
const listenForUserScroll = () => {
  // #ifdef H5
  if (typeof window !== 'undefined')
    for (const type of ['touchmove', 'wheel', 'keydown'])
      window.addEventListener(type, reading.startUserScroll, { passive: true })
  // #endif
}
/** 隐藏及卸载后停止接收其他页面输入，不能解除旧来源的只读边界 */
const stopListeningForUserScroll = () => {
  // #ifdef H5
  if (typeof window !== 'undefined')
    for (const type of ['touchmove', 'wheel', 'keydown'])
      window.removeEventListener(type, reading.startUserScroll)
  // #endif
}
const dictionary = useSceneDictionary({
  context: () =>
    !browseOnly.value &&
    !note.locked.value &&
    card.value &&
    card.value.access?.can_lookup !== false &&
    !accessError.value &&
    alive &&
    visible &&
    !stale.value &&
    session.userId()
      ? {
          cardId: id,
          versionId: card.value.version_id,
          owner: session.userId()!,
          accessVersion: card.value.access?.version
        }
      : null,
  request: session.request,
  prepareSpeech: (selection) => {
    createDictionaryAudio()
    return dictionaryAudio!.prepare(selection)
  },
  stopSpeech: (key) => audio?.stopWord(key),
  playSpeech: (key, load) => {
    if (note.locked.value || !visible) return
    createAudio()
    void audio?.playWord(
      key,
      load,
      card.value?.access
        ? async () => (await checkAccess()) && Boolean(card.value?.access?.can_lookup)
        : undefined
    )
  },
  onFailure: (reason) => invalid(reason)
})
const images = computed(() =>
  imageSrc.value && !imageError.value ? [{ src: imageSrc.value, generation: imageKey.value }] : []
)
const favorite = computed(
  () => card.value?.state?.favorite || summary.value?.state?.favorite || false
)
const canAdvance = computed(() =>
  Boolean(
    card.value?.state?.today_completed ||
    (queueSource.value === QueueSource.LEARNING && card.value?.state?.completed)
  )
)
const completionLabel = computed(() => {
  if (card.value && !card.value.state) return '完成本次学习'
  if (canAdvance.value && queueSource.value && !queueId.value) return '返回来源列表'
  if (canAdvance.value)
    return queueSource.value
      ? queueSource.value !== QueueSource.LEARNING && reviewOnEntry.value
        ? '复习下一张'
        : '继续学习下一张'
      : '前往学习页'
  return card.value?.state?.completed ? '完成本次复习' : '已完成学习'
})
/** 反馈作为新的原生页面入栈，返回时保留当前译文和阅读实例 */
const feedback = () => {
  if (!session.userId()) {
    promptLogin(`${Routes.SCENE}?id=${encodeURIComponent(id)}`)
    return
  }
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
        : queueSource.value === QueueSource.LEARNING_NOTES
          ? `${Routes.LEARNING}?tab=notes`
          : Routes.LEARNING
  )
/** 结束或直接单卡完成后回到学习入口 */
const learn = () => uni.reLaunch({ url: Routes.LEARNING })
/** 检查持久待确认完成，换页面或重新显示不能绕过原操作查询 */
const checkPendingCompletion = () => {
  const pending = Boolean(session.userId()) && operations.pending(`complete:${id}`)
  awaitingState.value = pending
  if (pending) actionError.value = '上次完成结果待确认，请先查询结果'
  return pending
}
/** 按实际视口提高正文优先级，保留同形词各自的完整受控位置 */
const prefetchDictionary = async () => {
  const cache = dictionaryAudio,
    scene = card.value
  if (!cache || !scene || (scene.content.audio_id && (!fullAudio || fullAudioBackgroundPending)))
    return
  if (dictionaryMeasuring) {
    dictionaryMeasureRequested = cache
    return
  }
  dictionaryMeasuring = true
  try {
    await nextTick()
    if (cache !== dictionaryAudio || !visible || !alive) return
    const blocks = (await dialogueView.value?.measureReading?.(scrollTop)) || []
    if (cache !== dictionaryAudio || scene !== card.value) return
    const info =
        typeof uni !== 'undefined' && typeof uni.getWindowInfo === 'function'
          ? uni.getWindowInfo()
          : null,
      height = info?.windowHeight || 0,
      visibleLines = new Set(
        blocks
          .filter((block) => block.top + block.height > scrollTop && block.top < scrollTop + height)
          .map((block) => block.anchor.replace(/^dialogue:/, ''))
      )
    cache.prefetch(
      dictionaryReferences,
      dictionaryReferences.filter((reference) => visibleLines.has(reference.line_id))
    )
  } finally {
    dictionaryMeasuring = false
    const requested = dictionaryMeasureRequested
    dictionaryMeasureRequested = null
    // 仅补做当前页面明确请求的最新测量，旧缓存返回不会重新调度自己
    if (requested && requested === dictionaryAudio && visible && alive) scheduleDictionaryPrefetch()
  }
}
/** 合并滚动期间的可见区测量，复用本版本已分词的正文引用 */
const scheduleDictionaryPrefetch = () => {
  if (dictionaryScrollTimer || !dictionaryAudio) return
  dictionaryScrollTimer = setTimeout(() => {
    dictionaryScrollTimer = undefined
    void prefetchDictionary()
  }, DICTIONARY_PREFETCH_SCROLL_DELAY_MS)
}
/** 正文展开后同步阅读锚点与可见词元优先级 */
const refreshDialogue = () => {
  void reading.refresh()
  void prefetchDictionary()
}
/** 正文音频由页面持有，弹窗开关不延长缓存或释放已下载文件 */
const createDictionaryAudio = () => {
  if (
    dictionaryAudio ||
    note.locked.value ||
    !visible ||
    !alive ||
    !card.value ||
    stale.value ||
    accessError.value ||
    browseOnly.value ||
    card.value.access?.can_lookup === false ||
    !session.userId()
  )
    return
  const scene = card.value,
    owner = session.userId(),
    profile = account.profile,
    accessVersion = scene.access?.version
  dictionaryReferences = (scene.content.dialogue || []).flatMap((line) =>
    dictionaryTokens(line, scene.content.vocabulary || [])
      .filter((token) => token.word)
      .map((token) => ({
        cardId: id,
        version_id: scene.version_id,
        word: token.lookup?.word ?? token.text,
        line_id: token.line_id,
        start: token.lookup?.start ?? token.start,
        end: token.lookup?.end ?? token.end
      }))
  )
  dictionaryAudio = createDictionarySpeechCache(
    () =>
      alive &&
      visible &&
      !stale.value &&
      !accessError.value &&
      !browseOnly.value &&
      session.userId() === owner &&
      account.profile === profile &&
      card.value?.version_id === scene.version_id &&
      card.value?.access?.version === accessVersion &&
      card.value?.access?.can_lookup !== false,
    (reason) => {
      void invalid(reason)
    }
  )
  void prefetchDictionary()
}
/** 页面可见且整段音频已准备结束时恢复后台词汇队列 */
const resumeBackgroundAudio = () => {
  if (note.locked.value || !visible || !alive || !card.value || fullAudioBackgroundPending) return
  void prefetchDictionary()
  wordAudio?.prefetch(
    (card.value.content.vocabulary || []).flatMap((word) => (word.id ? [word.id] : []))
  )
}
/** 进入当前场景时创建两路互斥音频，不自动播放 */
const createAudio = () => {
  if (runtimeMode.update() || note.locked.value || !visible || !card.value || stale.value) return
  createDictionaryAudio()
  if (audio) {
    resumeBackgroundAudio()
    return
  }
  const current = card.value,
    owner = account.profile,
    userId = session.identity()
  const full = createAudioPort(false, {
      title: current.content.name || current.content.title_en || '场景学习',
      resume: async (active) => {
        if (note.locked.value || runtimeMode.update() || (current.access && !(await checkAccess())))
          return
        if (
          !active() ||
          note.locked.value ||
          !alive ||
          audio !== player ||
          account.profile !== owner ||
          session.identity() !== userId ||
          card.value !== current ||
          stale.value
        )
          return
        const prepared = fullAudio
        if (prepared) await player.toggleFull(() => prepared.load())
      },
      leave: stopAudio,
      keepOnNavigate: (url) =>
        imageOpen && (url.startsWith('/sub-packages/scenes/image-preview') || !url)
    }),
    word = createAudioPort(true)
  backgroundFull = Boolean(full.background)
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
    () => fullAudio?.invalidate(),
    () => {
      wordAudio?.cancelSelection?.()
      dictionary.cancelSpeech()
    }
  )
  audio = player
  /** 确认两个准备任务仍属于当前页面、会话和发布版本 */
  const active = () =>
    alive &&
    audio === player &&
    account.profile === owner &&
    session.identity() === userId &&
    card.value?.version_id === current.version_id &&
    !stale.value
  /** 仅处理服务端确认的失效，后台网络失败不打断正文
   * @param reason 地址请求或下载得到的访问错误
   */
  const onFailure = (reason: unknown) => {
    if (
      reason instanceof ApiError &&
      ['speech_grant_expired', 'speech_grant_invalid'].includes(reason.code)
    )
      return
    if (reason instanceof ApiError && reason.status === 401) {
      stopAudio()
      void account.restore().catch(() => undefined)
    } else void invalid(reason)
  }
  if (current.content.audio_id) {
    const audioId = current.content.audio_id
    fullAudio = createFullAudioPreparation({
      networkOnly: full.background,
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
            session.contentRequest<components['schemas']['SpeechState']>(
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
  fullAudioBackgroundPending = Boolean(fullAudio)
  // 完整音频准备先占用下载通道；用户主动点词不受后台队列限制
  void Promise.resolve(fullAudio?.prefetch()).then(() => {
    if (!active()) return
    fullAudioBackgroundPending = false
    resumeBackgroundAudio()
  })
}
/** 离开场景时先停止播放器，再取消准备任务和释放临时音频 */
const stopAudio = () => {
  audioClickGeneration++
  dictionary.close()
  clearTimeout(dictionaryScrollTimer)
  dictionaryScrollTimer = undefined
  dictionaryMeasureRequested = null
  dictionaryReferences = []
  dictionaryAudio?.dispose()
  dictionaryAudio = null
  audio?.dispose()
  audio = null
  fullAudio?.dispose()
  fullAudio = null
  fullAudioBackgroundPending = false
  backgroundFull = false
  wordAudio?.dispose()
  wordAudio = null
}
/** 只应用最新的本人权限，当前仍免费时保留完整音轨和译文
 * @param value 当前场景的服务端安全摘要及权限
 */
const applyAccess = (value: components['schemas']['CardAccessView']) => {
  accessError.value = ''
  const previous = card.value
  if (previous?.access?.version !== value.access.version) {
    clearMediaAddresses()
    discardPreparedScene()
    dictionary.close()
    dictionaryAudio?.dispose()
    dictionaryAudio = null
  }
  if (!value.access.can_lookup) dictionary.close()
  if (value.access.can_learn && previous) {
    if (value.summary.version_id && value.summary.version_id !== previous.version_id) {
      stale.value = true
      stopAudio()
      imageGeneration++
      imageSrc.value = ''
      originalSrc = ''
      publicShare.clear()
      share.hide()
      return
    }
    previous.access = value.access
    createDictionaryAudio()
    previous.state = value.summary.state
    if (!previous.state?.today_completed && message.value === '今日已完成学习') message.value = ''
    checkPendingCompletion()
    return
  }
  if (!value.access.can_learn) {
    generation++
    imageGeneration++
    stopAudio()
    releaseImage?.()
    originalSrc = ''
    imageSrc.value = ''
    imageRequest = null
    card.value = null
    busy.value = false
    summary.value = { ...value.summary, access: value.access }
  }
}
const accessMonitor = createAccessMonitor(
  async () => {
    const owner = session.identity(),
      target = id
    const value = session.userId()
      ? await session.request<components['schemas']['CardAccessView']>(
          `/api/mini/v1/cards/${encodeURIComponent(target)}/access`
        )
      : await session
          .contentRequest<components['schemas']['PersonalSummary']>(
            `/api/mini/v1/cards/${encodeURIComponent(target)}/summary`
          )
          .then((summary) => {
            if (!summary.access) throw new ApiError('response_invalid', '权限暂未获取')
            return { summary, access: summary.access }
          })
    if (!alive || owner !== session.identity() || target !== id)
      throw new ApiError('session_changed', '账号或页面已变化')
    return value
  },
  applyAccess,
  (reason) => {
    accessError.value = '权限暂未获取，请重试'
    stopAudio()
    if (reason instanceof ApiError && [403, 404, 409, 410].includes(reason.status))
      void invalid(reason)
  }
)
/** 当前受控操作执行前重新核对权限 */
const checkAccess = async () => {
  const allowed = await accessMonitor.refresh()
  return allowed && !stale.value && !accessError.value
}
/** 点击弹窗喇叭立即显示准备状态，由播放控制器并行核对当前权限 */
const playDictionary = () => {
  if (note.locked.value || runtimeMode.update() || !visible || stale.value) return
  dictionary.play()
}
/** 拖动完整音频前核对当前场景权限
 * @param value 用户选择的播放位置
 */
const seekFull = async (value: number) => {
  if (card.value?.access && !(await checkAccess())) return
  if (!note.locked.value && visible) audio?.seekFull(value)
}
/** 调整倍速前核对当前场景权限
 * @param value 用户选择的播放倍速
 */
const setRate = async (value: number) => {
  if (card.value?.access && !(await checkAccess())) return
  if (!note.locked.value && visible) audio?.setRate(value)
}
/** 点词限制只显示提示，不能请求词典或暂停完整音频
 * @param token 用户点击的完整英文词元
 */
const lookup = async (token: DictionaryToken) => {
  if (note.locked.value || !visible) return
  if (card.value?.access) {
    if (!(await checkAccess())) return
    if (!card.value?.access?.can_lookup) {
      uni.showModal({ title: '学习授权提示', content: '点词查询需学习授权', showCancel: false })
      return
    }
  }
  if (!note.locked.value && visible) await dictionary.open(token)
}
/** 会话变化时释放私人文档和两路音频 */
const releasePrivateMedia = () => {
  pageIdentity = session.identity()
  generation++
  busy.value = false
  accessMonitor.suspend()
  note.cancel()
  card.value = null
  summary.value = null
  imageGeneration++
  imageSrc.value = ''
  originalSrc = ''
  imageRequest = null
  queueId.value = ''
  queueSource.value = null
  reading.dispose()
  stopAudio()
  if (visible && !session.userId() && !loginReturn.pending())
    void nextTick(() => {
      if (visible && alive && !loginReturn.pending()) void load()
    })
}
const releaseAudioSession = onSessionExpired(releasePrivateMedia)
watch(
  () => account.profile,
  () => {
    if (pageIdentity !== session.identity()) releasePrivateMedia()
  }
)
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
  if (![403, 404, 410].includes(reason.status)) return
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
    state: session.userId() ? previous?.state || null : null
  }
  try {
    const value = await session.contentRequest<components['schemas']['PersonalSummary']>(
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
        JSON.stringify([session.identity(), id, version]),
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
    await account.restore()
    const prepared = !requiresIdentityCheck && takePreparedScene(queueId.value, id)
    const value =
      (prepared &&
        (!prepared.access || queueSource.value === QueueSource.LEARNING_NOTES) &&
        prepared) ||
      (await session.contentRequest<PublishedScene>(
        `/api/mini/v1/cards/${id}${!session.userId() || restoringSnapshot || noteRecovery || noteBodyRefresh ? '?mark_started=false' : queueSource.value === QueueSource.LEARNING_NOTES ? '?require_study_note=true' : ''}`
      ))
    if (!alive || run !== generation) return
    stopAudio()
    requiresIdentityCheck = false
    accessError.value = ''
    card.value = value
    if (value.access) void checkAccess()
    reviewOnEntry.value = value.state?.completed || false
    if (value.state?.today_completed) message.value = '今日已完成学习'
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
    const snapshot = restoringSnapshot,
      restoredCard = card.value
    restoringSnapshot = null
    // 译文布局与来源滚动共用一次程序化恢复，恢复事件不进入本人进度
    void nextTick().then(async () => {
      if (!alive || run !== generation || card.value !== restoredCard) return
      const sameVersion = snapshot?.version === value.version_id
      if (sameVersion) dialogueView.value?.restoreTranslation?.(snapshot.translation)
      await reading.restore(value, sameVersion ? snapshot.scroll : undefined)
      if (!sameVersion || !alive || run !== generation || card.value !== restoredCard) return
      audio?.setRate(snapshot.playbackRate)
      audio?.seekFull(snapshot.audioPosition)
    })
    if (visible) void publicShare.prepare(id, value.version_id)
  } catch (reason) {
    if (!alive || run !== generation) return
    if (restoringSnapshot && reason instanceof ApiError && [404, 410].includes(reason.status)) {
      restoringSnapshot = null
      returnSource()
      return
    }
    if (reason instanceof ApiError && [403, 404, 410].includes(reason.status)) await invalid(reason)
    else if (reason instanceof ApiError && reason.code === 'study_note_unavailable') returnSource()
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
  const value = await session.contentRequest<PublishedScene>(
    `/api/mini/v1/cards/${id}?mark_started=false&version_id=${encodeURIComponent(version)}`
  )
  if (alive && card.value?.version_id === version) {
    card.value.state = value.state
    if (value.access)
      applyAccess({
        summary: {
          id,
          name: value.content.name,
          title_en: value.content.title_en || '',
          thumbnail_id: value.thumbnail_id || null,
          available: true,
          unavailable_reason: null,
          version_id: value.version_id,
          state: value.state
        },
        access: value.access
      })
    checkPendingCompletion()
  }
}
/** 已准备好的完整音频同步播放，提前点击只等待受控地址 */
const playFull = async () => {
  const run = ++audioClickGeneration,
    current = card.value
  if (note.locked.value || (current?.access && !(await checkAccess()))) return
  if (runtimeMode.update()) return
  if (
    !visible ||
    note.locked.value ||
    !alive ||
    run !== audioClickGeneration ||
    card.value !== current ||
    !current ||
    stale.value
  )
    return
  createAudio()
  const prepared = fullAudio
  if (prepared) void audio?.toggleFull(() => prepared.load())
}
/** 已准备的词汇同步从本地播放，未完成时复用当前任务
 * @param wordId 当前发布版本中的词汇编号
 */
const playWord = (wordId: string) => {
  if (runtimeMode.update()) return
  if (note.locked.value || !visible || !card.value || stale.value) return
  createAudio()
  const prepared = wordAudio
  if (prepared)
    void audio?.playWord(
      wordId,
      () => prepared.load(wordId),
      card.value.access ? checkAccess : undefined
    )
}
/** 原图作为全屏覆盖页进入原生栈，系统返回只关闭覆盖层 */
const previewImage = async () => {
  if (card.value?.access && !(await checkAccess())) return
  if (runtimeMode.update()) return
  if (!card.value?.content.image_id || stale.value) return
  imageOpen = true
  releaseImage?.()
  releaseImage = registerImagePreview({
    cardId: id,
    access: card.value.access,
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
  if (!(await account.ensure(`${Routes.SCENE}?id=${encodeURIComponent(id)}`))) return
  if (!favorite.value && card.value?.access && !(await checkAccess())) return
  if (runtimeMode.update()) return
  if (favoriteBusy.value || stale.value) return
  favoriteBusy.value = true
  actionError.value = ''
  try {
    if (favorite.value) {
      await operations.run(`favorite:${id}`, `/api/mini/v1/favorites/${id}`, 'DELETE')
      if (card.value?.state) card.value.state.favorite = false
      if (summary.value?.state) {
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
  if (
    !queueId.value ||
    !queueSource.value ||
    !card.value ||
    !canAdvance.value ||
    awaitingState.value ||
    !alive
  )
    return
  try {
    if (!sourceQueue.matches(queueId.value, id))
      throw new Error('本次来源已失效，请返回列表重新进入')
    const candidate = await sourceQueue.next()
    if (alive && !candidate) {
      if (
        queueSource.value === QueueSource.LEARNING ||
        queueSource.value === QueueSource.LEARNING_NOTES
      )
        returnSource()
      else queueEnd.value = true
    }
  } catch (reason) {
    if (alive) nextError.value = reason instanceof Error ? reason.message : '下一张暂未确认，请重试'
  }
}
/** 主动确认完成或复习，服务器成功后再读取可信统计 */
const complete = async () => {
  if (!(await account.ensure(`${Routes.SCENE}?id=${encodeURIComponent(id)}`))) return
  if (runtimeMode.update()) return
  if (card.value?.access && !(await checkAccess())) return
  if (accessError.value) return
  if (checkPendingCompletion()) return
  if (
    !card.value ||
    card.value.state?.today_completed ||
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
    awaitingState.value = Boolean(session.userId()) && operations.pending(`complete:${id}`)
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
    if (!sourceQueue.matches(queueId.value, id)) {
      returnSource()
      return
    }
    let nextId: string | null = null,
      nextScene: PublishedScene | null = null
    while (alive) {
      nextId = await sourceQueue.next()
      if (!alive) return
      if (!nextId) {
        if (
          queueSource.value === QueueSource.LEARNING ||
          queueSource.value === QueueSource.LEARNING_NOTES
        )
          returnSource()
        else queueEnd.value = true
        return
      }
      try {
        // notes 的最终正文准入与开始记录由服务端同事务校验，普通来源不增加PDF条件
        nextScene = await session.request<PublishedScene>(
          `/api/mini/v1/cards/${encodeURIComponent(nextId)}${queueSource.value === QueueSource.LEARNING_NOTES ? '?require_study_note=true' : ''}`
        )
        break
      } catch (reason) {
        if (
          reason instanceof ApiError &&
          ([403, 410].includes(reason.status) || reason.code === 'study_note_unavailable')
        ) {
          sourceQueue.skip(nextId)
          continue
        }
        throw reason
      }
    }
    if (!alive || !nextId || !nextScene) return
    await reading.save()
    const rollback = sourceQueue.commit(nextId)
    prepareSourceScene(queueId.value, nextScene)
    try {
      await new Promise<void>((resolve, reject) =>
        uni.redirectTo({
          url: `${Routes.SCENE}?id=${encodeURIComponent(nextId)}&queue=${encodeURIComponent(queueId.value)}${queueSource.value === QueueSource.LEARNING_NOTES ? '&source=learning_notes' : ''}`,
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
  noteIntent = query?.intent === 'study_note'
  noteRecovery = noteIntent
  if (query?.source === QueueSource.LEARNING_NOTES) queueSource.value = QueueSource.LEARNING_NOTES
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
  listenForUserScroll()
  loginReturn.register(
    Routes.SCENE,
    () => ({
      page: Routes.SCENE,
      type: 'scene',
      id,
      tab: queueSource.value === QueueSource.LEARNING_NOTES ? 'notes' : 'all',
      category: '',
      scroll: scrollTop,
      translation: dialogueView.value?.translated || false,
      audioPosition: audioState.value.position,
      playbackRate: audioState.value.rate,
      version: card.value?.version_id || ''
    }),
    () => {
      if (!visible || !alive) return
      restoringSnapshot = loginReturn.take(Routes.SCENE, id)
      noteRecovery = true
      queueId.value = ''
      queueSource.value = restoringSnapshot?.tab === 'notes' ? QueueSource.LEARNING_NOTES : null
      void load()
    }
  )
  const restored = loginReturn.take(Routes.SCENE, id)
  if (restored) {
    restoringSnapshot = restored
    noteRecovery = true
    queueId.value = ''
    queueSource.value = restored.tab === 'notes' ? QueueSource.LEARNING_NOTES : null
    sourceQueue.clear()
    void load()
    return
  }
  if (!card.value && id && !busy.value && !runtimeMode.update()) {
    void load()
    return
  }
  if (runtimeMode.update()) {
    if (visible && !homeSummary.value && id) void publicShare.prepare(id)
    return
  }
  if (note.show()) {
    audio?.refreshFull()
    if (card.value?.access) void checkAccess()
    return
  }
  if (note.locked.value) return
  if (card.value) {
    if (card.value.access) {
      void checkAccess().then((allowed) => {
        if (allowed && card.value && !stale.value) {
          createAudio()
          audio?.refreshFull()
          void publicShare.prepare(id, card.value.version_id, true)
        }
      })
      return
    }
    createAudio()
    audio?.refreshFull()
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
onPageScroll((event) => {
  scrollTop = event.scrollTop
  reading.scroll(event.scrollTop)
  scheduleDictionaryPrefetch()
})
onHide(() => {
  stopListeningForUserScroll()
  visible = false
  audioClickGeneration++
  dictionaryMeasureRequested = null
  clearTimeout(dictionaryScrollTimer)
  dictionaryScrollTimer = undefined
  if (note.hide()) {
    pauseForNote()
    share.hide()
    publicShare.clear()
    return
  }
  dictionary.close()
  dictionaryAudio?.dispose()
  dictionaryAudio = null
  if (!backgroundFull) accessMonitor.suspend()
  share.hide()
  publicShare.clear()
  if (!runtimeMode.update()) void reading.save()
  if (backgroundFull) {
    if (audioState.value.status === AudioStatus.LOADING) audio?.pauseFull()
    audio?.refreshFull()
    if (audioState.value.wordId) audio?.stopWord(audioState.value.wordId)
    wordAudio?.cancelSelection()
  } else if (!imageOpen) {
    stopAudio()
  }
})
onUnload(() => {
  stopListeningForUserScroll()
  share.hide()
  publicShare.clear()
  if (!runtimeMode.update()) void reading.save()
  reading.dispose()
  accessMonitor.dispose()
  note.cancel()
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
    :title="
      summary?.access?.reason === LearningAccessReason.REQUIRED
        ? '学习授权提示'
        : summary
          ? '场景卡暂不可用'
          : '场景学习'
    "
    :back="!browseOnly"
    :custom-back="Boolean(queueSource)"
    :footer="!browseOnly"
    public-summary
    :shareable="!browseOnly && Boolean(card) && !stale && publicShare.ready.value"
    :share-channels="{
      friends: publicShare.channels.friends.ready,
      timeline: publicShare.channels.timeline.ready
    }"
    @back="returnSource"
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
    <view
      v-else
      class="scene-reading"
      @touchmove="reading.startUserScroll"
      @wheel="reading.startUserScroll"
      @keydown="reading.startUserScroll"
      ><AppState :busy="busy && !card" :error="error" @retry="load" /><view
        v-if="accessError"
        class="notice error"
        >{{ accessError }}<button @click="checkAccess">重试权限</button></view
      ><template v-if="stale"
        ><view class="notice">内容已更新，请重新获取后继续学习</view
        ><button class="primary" @click="load">刷新内容</button></template
      ><SceneUnavailable
        v-else-if="summary"
        :summary="summary"
        :favorite-busy="favoriteBusy"
        :message="message"
        :shared-entry="sharedEntry"
        @unfavorite="toggleFavorite" /><template v-else-if="card && !accessError"
        ><text v-if="!card.state" class="guest-reading-note"
          >当前为游客体验，登录后可保存学习记录。</text
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
                :src="
                  favorite
                    ? '/static/listening/r17-favorite-filled.svg'
                    : '/static/design/heart.svg'
                "
                mode="aspectFit"
                aria-hidden="true"
              /><text>{{ favoriteBusy ? '处理中' : favorite ? '已收藏' : '收藏' }}</text>
            </button></view
          ><view v-if="card.access" class="between"
            ><text>{{ card.access.is_free ? '免费开放' : '授权有效' }}</text
            ><text v-if="!card.access.can_lookup" class="access-hint"
              >点词查询需学习授权</text
            ></view
          ><view class="scene-heading" :class="{ 'has-note': card.study_note?.state === 'ready' }"
            ><text v-if="card.content.title_en" class="scene-english">{{
              card.content.title_en
            }}</text
            ><button
              v-if="card.study_note?.state === 'ready'"
              class="note-entry"
              :disabled="note.busy.value || note.locked.value"
              @click="openNote"
            >
              <image
                src="@/sub-packages/scenes/static/study-note.svg"
                mode="aspectFit"
              />查看学习笔记
            </button></view
          >
          <view v-if="note.busy.value" class="note-loading"
            ><AppLoading compact label="正在打开学习笔记"
          /></view>
          <view v-if="note.error.value" class="note-error" role="alert"
            ><view
              ><text class="note-error-title">学习笔记暂时无法打开</text
              ><text>{{ note.error.value }}</text></view
            ><button @click="openNote">重试</button></view
          >
          <view class="scene-picture">
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
            @seek="seekFull"
            @rate="setRate" /></view
        ><SceneDialogue
          ref="dialogueView"
          :key="`${id}:${card.version_id}`"
          :dialogue="card.content.dialogue || []"
          :vocabulary="card.content.vocabulary || []"
          @layout="refreshDialogue"
          @lookup="lookup"
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
        :source-sentence="
          card?.content.dialogue?.find((line) => line.id === dictionary.selection.value?.line_id)
            ?.english || ''
        "
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
        @play="playDictionary" /><SceneQueueEnd
        v-if="queueEnd"
        :source="queueSource"
        :free-complete="sourceQueue.endReason() === 'free_complete'"
        @learn="returnSource"
        @stay="queueEnd = false" /><ShareSheet
        v-if="share.open.value"
        scene
        :friends="publicShare.friends()"
        :timeline="publicShare.timeline()"
        :channels="publicShare.channels"
        :summary-busy="publicShare.summaryBusy.value"
        :error="publicShare.error.value"
        @retry="publicShare.retry"
        @close="share.close" /></view
    ><template #footer
      ><view
        v-if="card && !stale && !accessError"
        class="safe-footer"
        @touchmove="reading.startUserScroll"
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
.access-banner {
  padding: 20rpx 0 28rpx;
  margin: 12rpx 0 28rpx;
  border-bottom: 1px solid #dfe5d8;

  .access-badge {
    padding: 6rpx 20rpx;
    border-radius: 10rpx;
    background: #e4f0db;
    font-size: 24rpx;
  }

  .access-hint {
    color: #586c5b;
    font-size: 24rpx;
  }
}

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

.scene-heading {
  margin-bottom: 53.846rpx;

  &.has-note {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    column-gap: 16px;
  }

  .note-entry {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 44px;
    margin: 0 0 0 auto;
    padding: 0 2px;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: #41664d;
    font-size: 13px;
    font-weight: 500;

    &::after {
      border: 0;
    }

    image {
      width: 15px;
      height: 17px;
    }
  }
}

.note-loading {
  margin: -20rpx 0 24rpx;
}

.note-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: -20rpx 0 34rpx;
  padding: 12px 14px;
  border: 1px solid #efc5ad;
  border-radius: 8px;
  background: #faeddf;
  color: #ad4f32;
  font-size: 12px;

  text {
    display: block;
  }

  .note-error-title {
    color: #2b4438;
    font-size: 13px;
    font-weight: 700;
  }

  button {
    flex-shrink: 0;
    min-height: 44px;
    padding: 0;
    border: 0;
    background: none;
    color: #ad4f32;
    font-size: 12px;
  }
}

.scene-english {
  display: block;
  font-family: var(--app-serif-font, Fraunces, Georgia, serif);
  font-size: 42.308rpx;
  line-height: 1.42;
  min-width: 0;
  max-width: 100%;
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
    font-family: var(--app-serif-font, Fraunces, Georgia, serif);
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
