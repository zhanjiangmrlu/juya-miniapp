import { onHide, onLoad, onPageScroll, onShow, onUnload } from '@dcloudio/uni-app'
import { computed, nextTick, ref, watch } from 'vue'

import {
  getListeningArticle,
  listeningMedia,
  openListeningArticle,
  saveListeningProgress,
  writeListening
} from '@/features/listening/listening-service'
import { onSessionExpired, session } from '@/services/api'
import { createAudioController } from '@/services/audio-controller'
import { createAudioPort } from '@/services/audio-port'
import { ApiError } from '@/services/errors'
import { createFullAudioPreparation } from '@/services/full-audio-preparation'
import { loginReturn } from '@/services/login-return'
import { backTo } from '@/services/navigation'
import { operationKey, resourceURL, storage } from '@/services/platform'
import { prepareAudioCacheFile } from '@/services/word-audio-file'
import { LISTENING_API, LISTENING_PROGRESS_DRAFT_PREFIX } from '@/shared/constants/listening'
import { Routes } from '@/shared/constants/navigation'
import { AudioStatus } from '@/shared/enums/audio'
import { LearningAccessReason } from '@/shared/enums/learning-access'
import { useAccountStore } from '@/stores/account-store'
import {
  readingAnchor,
  restoreProgress,
  tokenizeBody
} from '@/sub-packages/listening/reading-model'

import type { components } from '@/shared/contracts/generated/mini-api'
import type { AudioState } from '@/shared/types/audio'
import type { DictionaryResult, DictionarySelection } from '@/shared/types/dictionary'
import type {
  ListeningAccess,
  ListeningArticle,
  ListeningProgress,
  ListeningSummary,
  ListeningToken
} from '@/shared/types/listening'
import type { ListeningBodyHandle } from '@/shared/types/listening-components'
import type { LoginSnapshot } from '@/shared/types/navigation'
import type { Ref } from 'vue'
/** 管理文章受控权限、同版本进度、互斥音轨及完成后的分类顺序
 * @param pageShareEntry 通用分享入口标记，分享落地不启动文章加载
 */
export const useListeningArticle = (pageShareEntry?: Readonly<Ref<boolean>>) => {
  const bodyRef = ref<ListeningBodyHandle | null>(null)
  const account = useAccountStore(),
    id = ref(''),
    queueToken = ref(''),
    article = ref<ListeningArticle | null>(null),
    summary = ref<ListeningSummary | null>(null),
    busy = ref(false),
    error = ref(''),
    permissionError = ref(''),
    translation = ref(false),
    saveError = ref(''),
    actionError = ref(''),
    actionBusy = ref(false),
    nextArticle = ref<ListeningSummary | null>(null),
    endedTopic = ref(false),
    endedCategoryId = ref(''),
    completed = ref(false),
    completionResult = ref<components['schemas']['ListeningCompletionResult'] | null>(null),
    lookupRestricted = ref(false),
    image = ref(''),
    imageError = ref(''),
    imageOpen = ref(false),
    selection = ref<DictionarySelection | null>(null),
    dictionary = ref<DictionaryResult | null>(null),
    dictionaryBusy = ref(false),
    dictionaryError = ref(''),
    follow = ref(true)
  const audio = ref<AudioState>({
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
  let controller: ReturnType<typeof createAudioController> | null = null,
    full: ReturnType<typeof createAudioPort> | null = null,
    timer: ReturnType<typeof setInterval> | undefined,
    expiry: ReturnType<typeof setTimeout> | undefined,
    generation = 0,
    authorizationGeneration = 0,
    wordGeneration = 0,
    readingPosition = 0,
    currentScroll = 0,
    alive = true,
    visible = false,
    following = false,
    audioOwner = '',
    lastParagraph = -1,
    autosave = 0,
    progressDirty = false,
    restoringProgress = false,
    guestProgress: (ListeningProgress & { identity: string }) | null = null,
    restoringSnapshot: LoginSnapshot | null = null,
    fullPreparation: ReturnType<typeof createFullAudioPreparation> | null = null,
    saveChain: Promise<void> = Promise.resolve(),
    anchorTimer: ReturnType<typeof setTimeout> | undefined,
    lastAction: (() => Promise<void>) | null = null
  watch(
    [translation, () => audio.value.rate, () => audio.value.position],
    () => {
      if (!restoringProgress && visible && article.value) progressDirty = true
    },
    { flush: 'sync' }
  )
  const target = computed(() => `${Routes.ARTICLE}?id=${id.value}`)
  /** 释放当前文章的两个音轨和未完成异步处理 */
  const stop = () => {
    authorizationGeneration++
    wordGeneration++
    clearInterval(timer)
    clearTimeout(anchorTimer)
    clearTimeout(expiry)
    controller?.dispose()
    controller = null
    full = null
    fullPreparation?.dispose()
    fullPreparation = null
    if (audio.value.status === AudioStatus.PLAYING || audio.value.status === AudioStatus.LOADING)
      audio.value = { ...audio.value, status: AudioStatus.PAUSED }
  }
  /** 读取失败及失效时关闭私有内容，不回退旧正文
   * @param reason 当前真实服务端错误
   */
  const deny = (reason: unknown) => {
    stop()
    article.value = null
    image.value = ''
    imageOpen.value = false
    selection.value = null
    error.value = reason instanceof Error ? reason.message : '权限暂未获取，请重试'
  }
  /** 当前前台受控资源明确拒绝时停音清理，锁屏前的迟到错误不影响恢复后的页面
   * @param request 当前受保护资源请求
   * @param current 发出请求时的已确认文章版本
   */
  const guardResource = async <T>(request: Promise<T>, current: ListeningArticle): Promise<T> => {
    const run = generation
    try {
      return await request
    } catch (reason) {
      if (
        run === generation &&
        alive &&
        visible &&
        article.value === current &&
        reason instanceof ApiError
      ) {
        if ([401, 403, 404].includes(reason.status || 0)) deny(reason)
        else if (reason.status === 409) void authorize()
      }
      throw reason
    }
  }
  /** 保存实际阅读及媒体位置，失败明确展示并保留可重试操作 */
  const save = async () => {
    const value = article.value,
      owner = session.userId()
    if (!value?.version_id) return
    const progress = {
      version_id: value.version_id,
      reading_position: Math.round(readingPosition),
      translation_open: translation.value,
      audio_position: audio.value.position,
      playback_rate: audio.value.rate
    }
    if (!owner) {
      guestProgress = { ...progress, identity: session.identity() }
      return
    }
    if (!progressDirty) return
    const epoch = session.identity()
    const key = LISTENING_PROGRESS_DRAFT_PREFIX + owner + ':' + value.id + ':' + value.version_id
    storage.set(key, progress)
    saveChain = saveChain.then(async () => {
      if (epoch !== session.identity()) return
      try {
        await saveListeningProgress(value.id, progress)
        if (JSON.stringify(storage.get(key)) === JSON.stringify(progress)) storage.remove(key)
        if (owner === session.userId()) saveError.value = ''
      } catch (reason) {
        if (owner === session.userId())
          saveError.value = reason instanceof Error ? reason.message : '阅读进度未同步，请重试'
        if (reason instanceof ApiError && [403, 404, 409].includes(reason.status || 0))
          void authorize()
      }
    })
    await saveChain
  }
  /** 将实时可视正文位置换成合法code point锚点，表达及完成区不会写入像素值 */
  const captureAnchor = async () => {
    const value = article.value
    if (!value) return
    const words = tokenizeBody(value.payload.body_en)
      .flatMap((paragraph) => paragraph.tokens)
      .filter((token) => token.word)
    const blocks = await bodyRef.value?.measureReading(0)
    if (article.value?.version_id !== value.version_id || !blocks?.length) return
    readingPosition = readingAnchor(
      words,
      blocks.map((block) => ({ top: block.top, bottom: block.top + block.height })),
      110
    )
  }
  /** 当前播放段离开可视区域才适度跟随，手动浏览时不抢位置 */
  const scrollFollow = () => {
    if (!visible || !follow.value || !article.value || audio.value.status !== AudioStatus.PLAYING)
      return
    const word = (article.value.timeline.words || []).find(
      (item) =>
        audio.value.position * 1000 >= item.start_ms && audio.value.position * 1000 < item.end_ms
    )
    if (!word) return
    const before = Array.from(article.value.payload.body_en).slice(0, word.start).join(''),
      index = before.split(/\r\n|\r|\n/).length - 1
    if (index === lastParagraph) return
    lastParagraph = index
    void bodyRef.value?.measureReading(0).then((blocks) => {
      const block = blocks.find((item) => Number(item.anchor) === word.start)
      if (
        block &&
        (block.top < 110 || block.top + block.height > uni.getSystemInfoSync().windowHeight - 80)
      ) {
        following = true
        uni.pageScrollTo({
          scrollTop: Math.max(0, currentScroll + block.top - 110),
          duration: 0,
          complete: () => {
            following = false
          }
        })
      }
    })
  }
  /** 根据每次服务端权限快照重设到期复核，不依赖设备时钟
   * @param access 本次服务端确认的权限及服务器时间
   */
  const scheduleExpiry = (access: ListeningAccess) => {
    clearTimeout(expiry)
    const until = access.expires_at
      ? Date.parse(access.expires_at) - Date.parse(access.server_now)
      : 0
    if (until > 0) expiry = setTimeout(() => void authorize(), Math.min(until + 50, 2147483647))
  }
  /** 按音轨、身份和版本复核权限，后台保留同会话失效结果并拒绝旧请求 */
  const authorize = async () => {
    const current = article.value,
      run = ++authorizationGeneration,
      owner = session.identity(),
      track = controller
    if (
      !current ||
      !alive ||
      (!visible && !full?.background) ||
      (audioOwner && audioOwner !== session.identity())
    )
      return false
    try {
      const checked = await session.contentRequest<ListeningSummary>(
        `${LISTENING_API}/articles/${current.id}/summary`
      )
      if (
        run !== authorizationGeneration ||
        article.value !== current ||
        controller !== track ||
        !alive ||
        (!visible && !full?.background) ||
        audioOwner !== owner ||
        owner !== session.identity()
      )
        return false
      if (!checked.access.can_learn || !checked.available) {
        summary.value = checked
        throw new ApiError(
          checked.access.reason || 'listening_locked',
          checked.access.reason === LearningAccessReason.REQUIRED
            ? '此篇需学习授权'
            : '当前文章暂不可学习'
        )
      }
      if ((!visible && !full?.background) || !alive) return false
      if (checked.version_id !== current.version_id) {
        stop()
        article.value = null
        await load()
        return false
      }
      current.access = checked.access
      scheduleExpiry(checked.access)
      permissionError.value = ''
      if (!checked.access.can_lookup) {
        selection.value = null
        if (audio.value.wordId && !audio.value.wordId.startsWith('vocabulary:'))
          controller?.stopWord(audio.value.wordId)
      }
      return true
    } catch (reason) {
      if (
        run === authorizationGeneration &&
        article.value === current &&
        controller === track &&
        owner === session.identity() &&
        alive &&
        (visible || full?.background)
      )
        deny(reason)
      return false
    }
  }
  /** 前台按原生媒体时钟同步高亮，后台不测量正文或依赖循环计时 */
  const startClock = () => {
    clearInterval(timer)
    timer = setInterval(() => {
      if (
        full &&
        Number.isFinite(full.duration) &&
        full.duration > 0 &&
        controller &&
        controller.state.duration !== full.duration
      ) {
        controller.state.duration = full.duration
        audio.value = { ...controller.state }
      }
      if (audio.value.status === AudioStatus.PLAYING && full) {
        const actual = full.currentTime
        if (Number.isFinite(actual)) {
          controller!.state.position = actual
          audio.value = {
            ...controller!.state,
            position: actual,
            duration: Number.isFinite(full.duration) ? full.duration : audio.value.duration
          }
          scrollFollow()
        }
      }
      if (++autosave % 250 === 0) void save()
      if (autosave % 750 === 0) void authorize()
    }, 40)
  }
  /** 为已成功读取的文章设置播放轨道并恢复媒体位置，不自动播放 */
  const setup = () => {
    const value = article.value
    if (!value?.version_id) return
    audioOwner = session.identity()
    full = createAudioPort(false, {
      title: value.title_zh || value.title_en || '听读文章',
      resume: async (active) => {
        if (!(await authorize()) || !active() || controller !== currentController) return
        const prepared = fullPreparation
        if (prepared) await currentController.toggleFull(() => prepared.load())
      },
      leave: () => {
        void save()
        stop()
      }
    })
    controller = createAudioController(
      full,
      createAudioPort(true),
      (state) => {
        audio.value = { ...state }
      },
      { rate: 1 },
      () => {},
      () => {
        fullPreparation?.invalidate()
      },
      () => {
        wordGeneration++
      }
    )
    const currentController = controller
    if (value.payload.audio_id) {
      const owner = session.identity()
      fullPreparation = createFullAudioPreparation({
        networkOnly: full.background,
        active: () =>
          alive &&
          (visible || Boolean(full?.background)) &&
          controller === currentController &&
          article.value === value &&
          session.identity() === owner,
        resolve: () => guardResource(listeningMedia(value, value.payload.audio_id!), value),
        download: prepareAudioCacheFile,
        prepared: (url) => currentController.prepareFull(url),
        onFailure: (reason) => {
          if (
            article.value === value &&
            reason instanceof ApiError &&
            [401, 403, 404].includes(reason.status || 0)
          )
            deny(reason)
        }
      })
      void fullPreparation.prefetch()
    }
    const draftKey =
      LISTENING_PROGRESS_DRAFT_PREFIX + session.userId() + ':' + value.id + ':' + value.version_id
    restoringProgress = true
    progressDirty = false
    const pending = session.userId()
      ? (storage.get(draftKey) as ListeningProgress | undefined)
      : guestProgress?.identity === session.identity() &&
          guestProgress.version_id === value.version_id
        ? guestProgress
        : undefined
    const restored = restoreProgress(
      value.version_id,
      pending?.version_id === value.version_id ? pending : value.progress
    )
    saveError.value = pending && session.userId() ? '上次阅读进度未同步，请重试' : ''
    translation.value = restored.translation_open
    readingPosition = restored.reading_position
    controller.state.position = restored.audio_position
    controller.setRate(restored.playback_rate)
    controller.state.duration = value.audio_duration
    audio.value = { ...controller.state }
    if (readingPosition) {
      const words = tokenizeBody(value.payload.body_en)
          .flatMap((paragraph) => paragraph.tokens)
          .filter((token) => token.word),
        anchor = words.filter((word) => word.start <= readingPosition).at(-1)?.start || 0
      void nextTick(async () => {
        const blocks = await bodyRef.value?.measureReading(0),
          block = blocks?.find((item) => Number(item.anchor) === anchor)
        if (article.value?.version_id === value.version_id && block)
          uni.pageScrollTo({ scrollTop: Math.max(0, currentScroll + block.top - 110), duration: 0 })
      })
    }
    const snapshot = restoringSnapshot
    restoringSnapshot = null
    if (snapshot?.version === value.version_id && !value.progress) {
      translation.value = snapshot.translation
      controller.state.position = snapshot.audioPosition
      controller.setRate(snapshot.playbackRate)
      audio.value = { ...controller.state }
      void nextTick(() => {
        if (article.value === value) uni.pageScrollTo?.({ scrollTop: snapshot.scroll, duration: 0 })
      })
    }
    void nextTick(() => {
      restoringProgress = false
    })
    startClock()
    scheduleExpiry(value.access)
  }
  /** 文章进入及回到前台按身份重新鉴权，读取失败展示明确重试 */
  const load = async () => {
    if (!id.value || busy.value) return
    busy.value = true
    error.value = ''
    const run = ++generation
    try {
      await account.restore()
      const value = await getListeningArticle(id.value)
      if (!value.version_id) throw new ApiError('response_invalid', '文章版本暂未获取，请重试')
      if (!queueToken.value && !restoringSnapshot) queueToken.value = value.queue_token || ''
      if (run !== generation || !alive || !visible) return
      stop()
      article.value = value
      summary.value = value
      completed.value = false
      completionResult.value = null
      lookupRestricted.value = false
      nextArticle.value = null
      endedTopic.value = false
      setup()
    } catch (reason) {
      if (run === generation) {
        if (restoringSnapshot && reason instanceof ApiError && [404, 410].includes(reason.status)) {
          const category = restoringSnapshot.category
          restoringSnapshot = null
          backTo(
            `${Routes.LISTENING}${category ? `?category_id=${encodeURIComponent(category)}` : ''}`
          )
          return
        }
        deny(reason)
        try {
          summary.value = await session.contentRequest(
            `${LISTENING_API}/articles/${id.value}/summary`
          )
        } catch {
          summary.value = null
        }
      }
    } finally {
      if (run === generation) busy.value = false
    }
  }
  /** 手动播放先验权，隐藏或切换会话后取消迟到的页面点击 */
  const toggle = async () => {
    const run = generation,
      player = controller
    if (!alive || !visible || !player) return
    if (audio.value.status === AudioStatus.PLAYING) {
      await player.toggleFull(() => '')
      return
    }
    if (
      !(await authorize()) ||
      !alive ||
      !visible ||
      run !== generation ||
      controller !== player ||
      !article.value?.payload.audio_id
    )
      return
    follow.value = true
    lastParagraph = -1
    const prepared = fullPreparation
    if (prepared) await player.toggleFull(() => prepared.load())
  }
  /** 拖动按原始音频秒数定位并重新开启跟随
   * @param seconds 媒体原始时间轴的秒数
   */
  const seek = (seconds: number) => {
    follow.value = true
    lastParagraph = -1
    controller?.seekFull(seconds)
  }
  /** 切换五档倍速只委托现有音频控制器
   * @param rate 用户选择的倍率
   */
  const setRate = (rate: number) => controller?.setRate(rate)
  /** 主动收藏或取消；已失效的本人收藏仍可取消 */
  const favorite = async () => {
    if (!(await account.ensure(target.value))) return
    const value = article.value || summary.value
    if (!value || actionBusy.value) return
    if (!value.state?.favorite && (!(await authorize()) || article.value !== value)) return
    actionBusy.value = true
    actionError.value = ''
    lastAction = favorite
    try {
      const remove = value.state?.favorite || false
      const result = await writeListening<{ favorite: boolean }>(
        `listening-favorite:${value.id}`,
        remove ? `/favorites/${value.id}` : `/articles/${value.id}/favorite`,
        remove ? 'DELETE' : 'PUT',
        remove ? undefined : { version_id: value.version_id }
      )
      if (value.state) value.state.favorite = result.favorite
    } catch (reason) {
      actionError.value = reason instanceof Error ? reason.message : '收藏未成功，请重试'
    } finally {
      actionBusy.value = false
    }
  }
  /** 完成成功后才展示成绩和服务端下一篇；读取失败不当作分类结束 */
  const complete = async () => {
    if (!(await account.ensure(target.value))) return
    lastAction = complete
    if (actionBusy.value || !(await authorize()) || !article.value) return
    const value = article.value
    actionBusy.value = true
    actionError.value = ''
    try {
      const result = await writeListening<components['schemas']['ListeningCompletionResult']>(
        `listening-complete:${value.id}`,
        `/articles/${value.id}/complete`,
        'POST',
        { version_id: value.version_id }
      )
      completionResult.value = result
      completed.value = true
      value.state = result.state
      await getNext()
    } catch (reason) {
      actionError.value = reason instanceof Error ? reason.message : '完成结果未确认，请重试'
    } finally {
      actionBusy.value = false
    }
  }
  /** 单独重试同分类后续查询，不重复提交已确认完成 */
  const getNext = async () => {
    lastAction = getNext
    try {
      const result = await session.request<components['schemas']['NextArticle']>(
        `${LISTENING_API}/articles/${id.value}/next?queue_token=${encodeURIComponent(queueToken.value)}`
      )
      nextArticle.value = result.article
      endedTopic.value = result.ended
      endedCategoryId.value = result.category_id
      actionError.value = ''
    } catch (reason) {
      endedTopic.value = false
      actionError.value = reason instanceof Error ? reason.message : '下一篇暂未获取，请重试'
    }
  }
  /** 查询本篇原图受控地址，打开覆盖层保留音轨与阅读状态 */
  const openImage = async () => {
    const value = article.value
    if (!value?.payload.image_id || !(await authorize()) || article.value !== value) return
    imageOpen.value = true
    imageError.value = ''
    try {
      image.value = await guardResource(listeningMedia(value, value.payload.image_id), value)
    } catch (reason) {
      imageError.value = reason instanceof Error ? reason.message : '原图加载失败，请重试'
    }
  }
  /** 仅查看释义不改变全文播放，未授权不发起词典请求
   * @param token 原文英文词及精确code point范围
   */
  const lookup = async (token: ListeningToken) => {
    const value = article.value
    if (!value?.version_id || !(await authorize()) || article.value !== value) return
    if (!value.access.can_lookup) {
      lookupRestricted.value = true
      return
    }
    lookupRestricted.value = false
    if (audio.value.wordId) controller?.stopWord(audio.value.wordId)
    selection.value = {
      cardId: value.id,
      version_id: value.version_id,
      word: token.text,
      line_id: 'body',
      start: token.start,
      end: token.end
    }
    dictionary.value = null
    dictionaryBusy.value = true
    dictionaryError.value = ''
    const current = selection.value
    try {
      const result = await session.request<DictionaryResult>(
        `${LISTENING_API}/articles/${value.id}/dictionary?version_id=${encodeURIComponent(value.version_id)}&start=${token.start}&end=${token.end}`
      )
      if (selection.value === current) dictionary.value = result
    } catch (reason) {
      if (selection.value === current)
        dictionaryError.value = reason instanceof Error ? reason.message : '查询失败，请重试'
    } finally {
      if (selection.value === current) dictionaryBusy.value = false
    }
  }
  /** 关闭词典只停止单词发音，不自动恢复全文 */
  const closeDictionary = () => {
    if (audio.value.wordId) controller?.stopWord(audio.value.wordId)
    selection.value = null
  }
  /** 单词发音与全文互斥，当前授权及点击位置均由服务端复核 */
  const pronounce = async () => {
    const value = article.value,
      current = selection.value
    if (!value?.version_id || !current) return
    await controller?.playWord(
      `${current.start}:${current.end}`,
      async () => {
        const path = `/articles/${value.id}/dictionary/pronunciation`,
          body = { version_id: value.version_id, start: current.start, end: current.end }
        let result = await writeListening<{ state: string; url?: string; retry_after?: number }>(
          `listening-pronunciation:${value.id}:${current.start}`,
          path,
          'POST',
          body
        )
        for (let count = 0; count < 12 && result.state === 'processing'; count++) {
          await new Promise((resolve) =>
            setTimeout(resolve, Math.min(5, result.retry_after || 1) * 1000)
          )
          if (selection.value !== current) throw new Error('已取消')
          result = await session.request(
            `${LISTENING_API}${path}?version_id=${value.version_id}&start=${current.start}&end=${current.end}`
          )
        }
        if (result.state !== 'ready' || !result.url) throw new Error('发音暂不可用')
        return resourceURL(result.url)
      },
      authorize
    )
  }
  /** 只播放当前版本预置词汇，免费阅读者无需正文查词授权
   * @param wordId 当前发布版本的稳定预置词条身份
   */
  const pronounceVocabulary = async (wordId: string) => {
    const value = article.value
    if (!value?.version_id || !value.payload.vocabulary?.some((word) => word.id === wordId)) return
    selection.value = null
    if (audio.value.wordId) controller?.stopWord(audio.value.wordId)
    const run = ++wordGeneration
    const active = () => run === wordGeneration && article.value === value && alive && visible
    await controller?.playWord(
      `vocabulary:${wordId}`,
      async () => {
        const path = `/articles/${encodeURIComponent(value.id)}/words/${encodeURIComponent(wordId)}/pronunciation`
        if (!active()) throw new Error('已取消')
        let result = await guardResource(
          session.userId()
            ? writeListening<components['schemas']['SpeechState']>(
                `listening.word:${value.id}:${wordId}`,
                path,
                'POST',
                { version_id: value.version_id }
              )
            : session.contentRequest<components['schemas']['SpeechState']>(
                `${LISTENING_API}${path}`,
                { method: 'POST', key: operationKey(), body: { version_id: value.version_id } }
              ),
          value
        )
        for (let count = 0; count < 12 && result.state === 'processing'; count++) {
          await new Promise((resolve) =>
            setTimeout(resolve, Math.min(5, result.retry_after || 1) * 1000)
          )
          if (!active()) throw new Error('已取消')
          result = await guardResource(
            session.contentRequest<components['schemas']['SpeechState']>(
              `${LISTENING_API}${path}?version_id=${encodeURIComponent(value.version_id!)}`
            ),
            value
          )
        }
        if (!active()) throw new Error('已取消')
        if (result.state !== 'ready' || !result.url) throw new Error('发音暂不可用，点击重试')
        return resourceURL(result.url)
      },
      authorize
    )
  }
  /** 清除账号失效后的私有文章和覆盖层 */
  const reset = () => {
    generation++
    queueToken.value = ''
    guestProgress = null
    restoringSnapshot = null
    progressDirty = false
    busy.value = false
    deny(new ApiError('unauthenticated', '请先同意并登录'))
    summary.value = null
    if (visible && !session.userId() && !loginReturn.pending())
      void nextTick(() => {
        if (visible && alive && !loginReturn.pending()) void load()
      })
  }
  const unsubscribe = onSessionExpired(reset)
  /** 还原页面地址中的队列凭证，避免下一篇请求再次编码后破坏签名
   * @param query 原生页面加载参数，凭证可能仍保留 URL 编码
   */
  const initializeRoute = (query?: Record<string, string | undefined>) => {
    id.value = query?.id || ''
    const token = query?.queue_token || ''
    try {
      queueToken.value = decodeURIComponent(token)
    } catch {
      queueToken.value = token
    }
  }
  onLoad((query) => {
    if (!pageShareEntry?.value) initializeRoute(query)
  })
  onShow(() => {
    if (pageShareEntry?.value) return
    visible = true
    loginReturn.register(
      Routes.ARTICLE,
      () => ({
        page: Routes.ARTICLE,
        type: 'listening',
        id: id.value,
        tab: '',
        category: (article.value || summary.value)?.category_id || '',
        scroll: currentScroll,
        translation: translation.value,
        audioPosition: audio.value.position,
        playbackRate: audio.value.rate,
        version: article.value?.version_id || ''
      }),
      () => {
        if (!visible || !alive) return
        restoringSnapshot = loginReturn.take(Routes.ARTICLE, id.value)
        queueToken.value = ''
        void load()
      }
    )
    const restored = loginReturn.take(Routes.ARTICLE, id.value)
    if (restored) {
      restoringSnapshot = restored
      queueToken.value = ''
      void load()
      return
    }
    if (controller && full?.background) {
      void authorize().then((allowed) => {
        if (!allowed || !visible || !controller) return
        controller.refreshFull()
        lastParagraph = -1
        startClock()
        scrollFollow()
      })
    } else void load()
  })
  onPageScroll((event) => {
    if (!restoringProgress && visible && Math.abs(currentScroll - event.scrollTop) > 1)
      progressDirty = true
    currentScroll = event.scrollTop
    clearTimeout(anchorTimer)
    anchorTimer = setTimeout(captureAnchor, 120)
    if (!following && audio.value.status === AudioStatus.PLAYING) follow.value = false
  })
  onHide(() => {
    visible = false
    generation++
    busy.value = false
    if (full?.background) {
      if (audio.value.status === AudioStatus.LOADING) controller?.pauseFull()
      controller?.refreshFull()
      if (audio.value.wordId) controller?.stopWord(audio.value.wordId)
      wordGeneration++
      clearInterval(timer)
      clearTimeout(anchorTimer)
    }
    void save()
    if (!full?.background) stop()
  })
  onUnload(() => {
    controller?.refreshFull()
    void save()
    alive = false
    visible = false
    generation++
    stop()
    unsubscribe()
  })
  /** 自定义返回先测量并提交进度，失败草稿仍可在同账号同版本重试 */
  const leave = async () => {
    await captureAnchor()
    await save()
    backTo(Routes.LISTENING)
  }
  /** 同队列前进前同步本篇，替换详情以保留原列表来源和冻结队列 */
  const advance = async () => {
    if (!nextArticle.value || actionBusy.value) return
    actionBusy.value = true
    actionError.value = ''
    lastAction = advance
    try {
      await captureAnchor()
      await save()
      if (saveError.value) throw new Error('进度尚未同步，请重试后打开下一篇')
      await openListeningArticle(nextArticle.value, queueToken.value, true)
    } catch (reason) {
      actionError.value = reason instanceof Error ? reason.message : '下一篇打开失败，请重试'
    } finally {
      actionBusy.value = false
    }
  }
  /** 重试最后失败的明确操作，收藏失败不会触发完成 */
  const retryAction = () => lastAction?.()
  return {
    bodyRef,
    leave,
    advance,
    queueToken,
    retryAction,
    article,
    summary,
    busy,
    error,
    permissionError,
    translation,
    saveError,
    actionError,
    actionBusy,
    nextArticle,
    endedTopic,
    endedCategoryId,
    completed,
    completionResult,
    lookupRestricted,
    image,
    imageError,
    imageOpen,
    selection,
    dictionary,
    dictionaryBusy,
    dictionaryError,
    audio,
    follow,
    load,
    save,
    toggle,
    seek,
    setRate,
    favorite,
    complete,
    getNext,
    openImage,
    lookup,
    closeDictionary,
    pronounce,
    pronounceVocabulary
  }
}
