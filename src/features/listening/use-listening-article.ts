import { onHide, onLoad, onPageScroll, onShow, onUnload } from '@dcloudio/uni-app'
import { computed, nextTick, ref } from 'vue'

import { createAudioController } from '@/features/learning/audio-controller'
import { onSessionExpired, session } from '@/services/api'
import { createAudioPort } from '@/services/audio-port'
import { ApiError } from '@/services/errors'
import { backTo } from '@/services/navigation'
import { resourceURL, storage } from '@/services/platform'
import { LISTENING_API, LISTENING_PROGRESS_DRAFT_PREFIX } from '@/shared/constants/listening'
import { Routes } from '@/shared/constants/navigation'
import { AudioStatus } from '@/shared/enums/audio'
import { useAccountStore } from '@/stores/account-store'

import type { components } from '@/shared/contracts/generated/mini-api'
import type { AudioState } from '@/shared/types/audio'
import type { DictionaryResult, DictionarySelection } from '@/shared/types/dictionary'
import type {
  ListeningArticle,
  ListeningProgress,
  ListeningSummary,
  ListeningToken
} from '@/shared/types/listening'
import type { ListeningBodyHandle } from '@/shared/types/listening-components'

import {
  getListeningArticle,
  listeningMedia,
  openListeningArticle,
  saveListeningProgress,
  writeListening
} from './listening-service'
import { readingAnchor, restoreProgress, tokenizeBody } from './reading-model'
/** 管理文章受控权限、同版本进度、互斥音轨及完成后的主题顺序 */
export const useListeningArticle = () => {
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
    readingPosition = 0,
    currentScroll = 0,
    alive = true,
    visible = false,
    following = false,
    lastParagraph = -1,
    autosave = 0,
    audioAddress: Promise<string> | null = null,
    saveChain: Promise<void> = Promise.resolve(),
    anchorTimer: ReturnType<typeof setTimeout> | undefined,
    lastAction: (() => Promise<void>) | null = null
  const target = computed(() => `${Routes.ARTICLE}?id=${id.value}`)
  /** 释放当前文章的两个音轨和未完成异步处理 */
  const stop = () => {
    clearInterval(timer)
    clearTimeout(anchorTimer)
    clearTimeout(expiry)
    controller?.dispose()
    controller = null
    full = null
    audioAddress = null
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
  /** 保存实际阅读及媒体位置，失败明确展示并保留可重试操作 */
  const save = async () => {
    const value = article.value,
      owner = session.userId()
    if (!value?.version_id || !owner) return
    const progress = {
      version_id: value.version_id,
      reading_position: Math.round(readingPosition),
      translation_open: translation.value,
      audio_position: audio.value.position,
      playback_rate: audio.value.rate
    }
    const key = LISTENING_PROGRESS_DRAFT_PREFIX + owner + ':' + value.id + ':' + value.version_id
    storage.set(key, progress)
    saveChain = saveChain.then(async () => {
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
    if (!follow.value || !article.value || audio.value.status !== AudioStatus.PLAYING) return
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
  /** 复核当前权限和发布版本；版本更新必须重新加载初始状态 */
  const authorize = async () => {
    const current = article.value
    if (!current) return false
    try {
      const checked = await session.request<ListeningSummary>(
        `${LISTENING_API}/articles/${current.id}/summary`
      )
      if (!checked.access.can_learn || !checked.available)
        throw new ApiError('listening_locked', '当前文章暂不可学习')
      if (!visible || !alive) return false
      if (checked.version_id !== current.version_id) {
        stop()
        article.value = null
        await load()
        return false
      }
      current.access = checked.access
      permissionError.value = ''
      if (!checked.access.can_lookup) {
        selection.value = null
        if (audio.value.wordId) controller?.stopWord(audio.value.wordId)
      }
      return true
    } catch (reason) {
      deny(reason)
      return false
    }
  }
  /** 为已成功读取的文章设置播放轨道并恢复媒体位置，不自动播放 */
  const setup = () => {
    const value = article.value
    if (!value?.version_id) return
    full = createAudioPort()
    controller = createAudioController(
      full,
      createAudioPort(true),
      (state) => {
        audio.value = { ...state }
      },
      { rate: 1 },
      () => {},
      () => {
        audioAddress = null
      }
    )
    const currentController = controller
    if (value.payload.audio_id) {
      audioAddress = listeningMedia(value, value.payload.audio_id)
      void audioAddress
        .then((url) => {
          if (controller === currentController) currentController.prepareFull(url)
        })
        .catch(() => {
          if (controller === currentController) audioAddress = null
        })
    }
    const draftKey =
      LISTENING_PROGRESS_DRAFT_PREFIX + session.userId() + ':' + value.id + ':' + value.version_id
    const pending = storage.get(draftKey) as ListeningProgress | undefined
    const restored = restoreProgress(
      value.version_id,
      pending?.version_id === value.version_id ? pending : value.progress
    )
    saveError.value = pending ? '上次阅读进度未同步，请重试' : ''
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
    const until = value.access.expires_at
      ? Date.parse(value.access.expires_at) - Date.parse(value.access.server_now)
      : 0
    if (until > 0) expiry = setTimeout(() => void authorize(), Math.min(until + 50, 2147483647))
  }
  /** 文章进入及回到前台先鉴权，读取失败展示明确重试 */
  const load = async () => {
    if (!id.value || busy.value) return
    busy.value = true
    error.value = ''
    const run = ++generation
    try {
      if (!(await account.ensure(target.value))) return
      const value = await getListeningArticle(id.value, queueToken.value)
      if (!value.version_id) throw new ApiError('response_invalid', '文章版本暂未获取，请重试')
      if (!queueToken.value) queueToken.value = value.queue_token
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
        deny(reason)
        try {
          summary.value = await session.request(`${LISTENING_API}/articles/${id.value}/summary`)
        } catch {
          summary.value = null
        }
      }
    } finally {
      if (run === generation) busy.value = false
    }
  }
  /** 手动播放先验权；查词只读时不会触发本方法 */
  const toggle = async () => {
    if (audio.value.status === AudioStatus.PLAYING) {
      await controller?.toggleFull(() => '')
      return
    }
    if (!(await authorize()) || !article.value?.payload.audio_id) return
    follow.value = true
    lastParagraph = -1
    const value = article.value
    await controller?.toggleFull(
      () => audioAddress || (audioAddress = listeningMedia(value, value.payload.audio_id!))
    )
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
    const value = article.value || summary.value
    if (!value || actionBusy.value) return
    actionBusy.value = true
    actionError.value = ''
    lastAction = favorite
    try {
      const remove = value.state.favorite
      const result = await writeListening<{ favorite: boolean }>(
        `listening-favorite:${value.id}`,
        remove ? `/favorites/${value.id}` : `/articles/${value.id}/favorite`,
        remove ? 'DELETE' : 'PUT',
        remove ? undefined : { version_id: value.version_id }
      )
      value.state.favorite = result.favorite
    } catch (reason) {
      actionError.value = reason instanceof Error ? reason.message : '收藏未成功，请重试'
    } finally {
      actionBusy.value = false
    }
  }
  /** 完成成功后才展示成绩和服务端下一篇；读取失败不当作主题结束 */
  const complete = async () => {
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
  /** 单独重试同主题后续查询，不重复提交已确认完成 */
  const getNext = async () => {
    lastAction = getNext
    try {
      const result = await session.request<{ article: ListeningSummary | null; ended: boolean }>(
        `${LISTENING_API}/articles/${id.value}/next?queue_token=${encodeURIComponent(queueToken.value)}`
      )
      nextArticle.value = result.article
      endedTopic.value = result.ended
      actionError.value = ''
    } catch (reason) {
      endedTopic.value = false
      actionError.value = reason instanceof Error ? reason.message : '下一篇暂未获取，请重试'
    }
  }
  /** 查询本篇原图受控地址，打开覆盖层保留音轨与阅读状态 */
  const openImage = async () => {
    const value = article.value
    if (!value?.payload.image_id) return
    imageOpen.value = true
    imageError.value = ''
    try {
      image.value = await listeningMedia(value, value.payload.image_id)
    } catch (reason) {
      imageError.value = reason instanceof Error ? reason.message : '原图加载失败，请重试'
    }
  }
  /** 仅查看释义不改变全文播放，未授权不发起词典请求
   * @param token 原文英文词及精确code point范围
   */
  const lookup = async (token: ListeningToken) => {
    const value = article.value
    if (!value?.version_id) return
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
  /** 清除账号失效后的私有文章和覆盖层 */
  const reset = () => {
    generation++
    deny(new ApiError('unauthenticated', '请先同意并登录'))
    summary.value = null
  }
  const unsubscribe = onSessionExpired(reset)
  onLoad((query) => {
    id.value = query?.id || ''
    queueToken.value = query?.queue_token || ''
  })
  onShow(() => {
    visible = true
    void load()
  })
  onPageScroll((event) => {
    currentScroll = event.scrollTop
    clearTimeout(anchorTimer)
    anchorTimer = setTimeout(captureAnchor, 120)
    if (!following && audio.value.status === AudioStatus.PLAYING) follow.value = false
  })
  onHide(() => {
    visible = false
    generation++
    busy.value = false
    void save()
    stop()
  })
  onUnload(() => {
    if (visible) void save()
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
    pronounce
  }
}
