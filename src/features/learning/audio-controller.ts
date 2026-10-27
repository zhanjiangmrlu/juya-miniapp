import { wordAudioRecovery } from '@/services/errors'
import { recordWordAudio } from '@/services/word-audio-diagnostics'
import { DEFAULT_PLAYBACK_RATE, PLAYBACK_RATES } from '@/shared/constants/audio'
import { WORD_AUDIO_RECOVERY_DELAYS } from '@/shared/constants/media'
import { AudioStatus } from '@/shared/enums/audio'

import type {
  AudioPort,
  AudioState,
  LearningAudioSession,
  PlaybackRate
} from '@/shared/types/audio'

import { learningAudioSession } from './learning-audio-session'

/** 用两条底层音轨实现完整音频与词汇的互斥播放
 * @param full 当前场景完整音频播放器
 * @param word 独立词汇播放器
 * @param changed 页面状态更新端口
 * @param speedSession 本轮学习共享的内存倍速
 * @param wordFailed 原生播放失败时清除对应词汇的预加载资源
 * @param fullFailed 完整音频播放失败时清除缓存并重新签发地址
 * @param wordCancelled 切换音轨时释放列表与弹窗共用的前台准备通道
 */
export const createAudioController = (
  full: AudioPort,
  word: AudioPort,
  changed: (state: AudioState) => void = () => {},
  speedSession: LearningAudioSession = learningAudioSession,
  wordFailed: (id: string) => void = () => {},
  fullFailed: () => void = () => {},
  wordCancelled: () => void = () => {}
) => {
  const state: AudioState = {
    rate: speedSession.rate,
    rateError: '',
    status: AudioStatus.IDLE,
    position: 0,
    duration: 0,
    error: '',
    wordId: null,
    wordStatus: AudioStatus.IDLE,
    wordError: ''
  }
  let alive = true,
    fullSource = '',
    fullGeneration = 0,
    wordGeneration = 0,
    wordSourceGeneration = 0,
    pendingSeek = 0,
    fullIntent = false,
    fullStarting = false,
    ratePausing = false,
    pendingRate: PlaybackRate | null = null,
    wordRecover: ((reason: unknown) => void) | null = null,
    wordRetryTimer: ReturnType<typeof setTimeout> | undefined,
    wordStarted = 0
  /** 取消本次点读恢复任务，离页或切词后不再启动旧音源 */
  const cancelWordRecovery = () => {
    clearTimeout(wordRetryTimer)
    wordRecover = null
  }
  /** 输出当前可信音频状态 */
  const notify = () => {
    if (alive) changed({ ...state })
  }
  /** 设置并回读底层倍率，拒绝无效档位或原生静默忽略
   * @param rate 用户指定的完整音频倍率
   */
  const applyRate = (rate: number) => {
    if (!PLAYBACK_RATES.includes(rate as PlaybackRate)) throw new Error('invalid rate')
    if (typeof full.playbackRate !== 'number') {
      if (rate === DEFAULT_PLAYBACK_RATE) return
      throw new Error('rate unsupported')
    }
    full.playbackRate = rate
    if (Math.abs(full.playbackRate - rate) > 0.001) throw new Error('rate rejected')
  }
  /** 确认底层设置后提交档位，失败时保留上次已确认倍率
   * @param rate 用户选择的倍率
   */
  const confirmRate = (rate: number) => {
    if (!alive) return false
    const previous = state.rate
    try {
      applyRate(rate)
      state.rate = rate as PlaybackRate
      speedSession.rate = state.rate
      state.rateError = ''
      notify()
      return true
    } catch {
      try {
        applyRate(previous)
      } catch {
        /* 原生拒绝时保持上次已确认档位 */
      }
      state.rateError = '当前设备未能设置该倍速，请重试或选择其他档位'
      notify()
      return false
    }
  }
  /** 等待原生播放事件确认启动，期间仍允许词汇或暂停取消续播 */
  const startFull = () => {
    fullStarting = true
    full.play()
  }
  /** 等待原生暂停确认后切速，多次选择只应用最后一次 */
  const pauseForRate = () => {
    ratePausing = true
    pendingSeek = Number.isFinite(full.currentTime) ? full.currentTime : state.position
    state.position = pendingSeek
    full.pause()
  }
  /** 播放中排队切速，暂停时直接设置且不主动播放
   * @param rate 用户最后选择的完整音频倍率
   */
  const setRate = (rate: number) => {
    if (!alive) return false
    if (!PLAYBACK_RATES.includes(rate as PlaybackRate)) return confirmRate(rate)
    if (
      pendingRate !== null ||
      ratePausing ||
      (fullIntent && (state.status === AudioStatus.PLAYING || fullStarting))
    ) {
      pendingRate = rate as PlaybackRate
      state.rateError = ''
      if (!ratePausing && !fullStarting) pauseForRate()
      notify()
      return !state.rateError
    }
    return confirmRate(rate)
  }
  /** 新资源或原生重新开始播放后重设本会话档位 */
  const restoreRate = () => {
    try {
      applyRate(state.rate)
    } catch {
      try {
        applyRate(DEFAULT_PLAYBACK_RATE)
        state.rate = DEFAULT_PLAYBACK_RATE
        speedSession.rate = DEFAULT_PLAYBACK_RATE
        state.rateError = '该倍速暂不可用，已恢复正常速度'
      } catch {
        state.rateError = '当前设备未能设置该倍速，请重试或选择其他档位'
      }
      notify()
    }
  }
  full.onPlay(() => {
    if (!alive) return
    fullStarting = false
    // 原生晚到的播放事件不能覆盖用户暂停、词汇点读或尚未确认的切速
    if (!fullIntent) {
      full.pause()
      return
    }
    if (pendingRate !== null && pendingRate !== state.rate) {
      if (!ratePausing) pauseForRate()
      return
    }
    pendingRate = null
    state.status = AudioStatus.PLAYING
    restoreRate()
    if (pendingSeek > 0) {
      full.seek(pendingSeek)
      pendingSeek = 0
    }
    notify()
  })
  full.onPause(() => {
    if (!alive) return
    state.status = AudioStatus.PAUSED
    ratePausing = false
    if (pendingRate !== null) {
      const rate = pendingRate
      pendingRate = null
      confirmRate(rate)
      if (fullIntent) startFull()
    } else if (!fullStarting) fullIntent = false
    notify()
  })
  full.onEnded(() => {
    if (!alive) return
    state.status = AudioStatus.ENDED
    fullIntent = false
    fullStarting = false
    pendingRate = null
    state.position = state.duration
    notify()
  })
  full.onTimeUpdate(() => {
    if (!alive) return
    state.position = Number.isFinite(full.currentTime) ? full.currentTime : 0
    state.duration = Number.isFinite(full.duration) ? full.duration : 0
    notify()
  })
  full.onError(() => {
    if (!alive) return
    state.status = AudioStatus.ERROR
    fullIntent = false
    fullStarting = false
    pendingRate = null
    state.error = '音频暂不可用，点击重试'
    fullFailed()
    notify()
  })
  word.onPlay(() => {
    if (!alive || !wordSourceGeneration || wordSourceGeneration !== wordGeneration) return
    recordWordAudio('native', wordStarted, 'ready')
    state.wordStatus = AudioStatus.PLAYING
    state.wordError = ''
    notify()
  })
  word.onEnded(() => {
    if (!alive || !wordSourceGeneration || wordSourceGeneration !== wordGeneration) return
    cancelWordRecovery()
    wordSourceGeneration = 0
    state.wordStatus = AudioStatus.IDLE
    state.wordError = ''
    notify()
  })
  word.onError((reason) => {
    if (!alive || !wordSourceGeneration || wordSourceGeneration !== wordGeneration) return
    recordWordAudio('native', wordStarted, 'error', reason)
    wordRecover?.(reason)
  })
  /** 空闲时提前绑定完整音源，播放或暂停后的资源不接受后台替换
   * @param src 当前场景已经准备好的音源
   */
  const prepareFull = (src: string) => {
    if (!alive || state.status !== AudioStatus.IDLE || fullIntent || fullStarting) return
    if (fullSource === src) return
    if (full.prepare) full.prepare(src)
    else full.src = src
    fullSource = src
  }
  /** 主动播放或暂停完整音频，同一音源续播与重播不重复设置地址
   * @param load 获取当前受控完整音频地址
   */
  const toggleFull = async (load: () => string | Promise<string>) => {
    if (!alive || state.status === AudioStatus.LOADING) return
    if (fullIntent) {
      fullIntent = false
      full.pause()
      return
    }
    if (state.wordId) wordCancelled()
    cancelWordRecovery()
    wordGeneration++
    wordSourceGeneration = 0
    word.stop()
    state.wordStatus = AudioStatus.IDLE
    state.wordId = null
    state.wordError = ''
    fullIntent = true
    const generation = ++fullGeneration
    if (state.status === AudioStatus.ENDED) {
      state.position = 0
      full.seek(0)
    }
    pendingSeek = state.position
    state.status = AudioStatus.LOADING
    state.error = ''
    notify()
    try {
      const source = load()
      const url = typeof source === 'string' ? source : await source
      if (!alive || generation !== fullGeneration) return
      if (fullSource !== url) {
        full.src = url
        fullSource = url
      }
      restoreRate()
      startFull()
    } catch {
      if (alive && generation === fullGeneration) {
        state.status = AudioStatus.ERROR
        fullIntent = false
        state.error = '音频暂不可用，点击重试'
        notify()
      }
    }
  }
  /** 播放受控词汇，准备与逐次验权并行，当前授权确认后才启动音轨
   * @param id 当前版本的词汇引用
   * @param load 获取该词汇的受控发音地址
   * @param authorize 当前点击及恢复前的联网权限核对
   */
  const playWord = async (
    id: string,
    load: () => string | Promise<string>,
    authorize?: () => Promise<boolean>
  ) => {
    if (!alive) return
    fullGeneration++
    const cancelFull = fullIntent || fullStarting || ratePausing
    fullIntent = false
    if (
      cancelFull ||
      state.status === AudioStatus.PLAYING ||
      state.status === AudioStatus.LOADING
    ) {
      full.pause()
      state.status = AudioStatus.PAUSED
    }
    if (state.wordId && state.wordId !== id) wordCancelled()
    cancelWordRecovery()
    const generation = ++wordGeneration
    wordSourceGeneration = 0
    word.stop()
    state.wordId = id
    state.wordStatus = AudioStatus.LOADING
    state.wordError = ''
    notify()
    let retries = 0,
      fileRetried = false,
      source = '',
      attemptGeneration = 0
    /** 确认异步准备与原生恢复仍属于用户最后一次点击 */
    const active = () => alive && generation === wordGeneration && state.wordId === id
    /** 按单次点击的统一预算恢复，权限与永久错误直接显示重试
     * @param reason 当前阶段的已知失败
     * @param run 本次点击中准备尝试的代次
     */
    const failed = (reason: unknown, run: number) => {
      if (!active() || run !== attemptGeneration) return
      attemptGeneration++
      wordSourceGeneration = 0
      word.stop()
      wordFailed(id)
      const kind = wordAudioRecovery(reason, Boolean(source && !/^https?:/.test(source)))
      const retry =
        kind && retries < WORD_AUDIO_RECOVERY_DELAYS.length && (kind !== 'file' || !fileRetried)
      if (!retry) {
        cancelWordRecovery()
        state.wordStatus = AudioStatus.ERROR
        state.wordError = '发音暂不可用，点击重试'
        notify()
        return
      }
      if (kind === 'file') fileRetried = true
      const delay = WORD_AUDIO_RECOVERY_DELAYS[retries++]!
      state.wordStatus = AudioStatus.LOADING
      state.wordError = ''
      notify()
      wordRetryTimer = setTimeout(() => {
        if (active()) void attempt()
      }, delay)
    }
    /** 同时准备音源和核对权限，旧选择与权限拒绝均不能触发播放 */
    const attempt = async () => {
      if (!active()) return
      const run = ++attemptGeneration
      const current = () => active() && run === attemptGeneration
      wordRecover = (reason) => failed(reason, run)
      const started = Date.now()
      /** 权限拒绝只关闭本次有效尝试，不影响已经切换的目标 */
      const denied = () => {
        if (!current()) return
        cancelWordRecovery()
        wordFailed(id)
        state.wordStatus = AudioStatus.IDLE
        state.wordError = ''
        notify()
      }
      const permission =
        authorize &&
        Promise.resolve()
          .then(authorize)
          .then((allowed) => {
            recordWordAudio('permission', started, allowed ? 'ready' : 'error')
            if (!allowed) denied()
            return allowed
          })
      // 先订阅权限拒绝，避免音源同步抛错留下未处理的并行拒绝
      const checked = permission?.catch((reason: unknown) => {
        recordWordAudio('permission', started, 'error', reason)
        denied()
        return false
      })
      try {
        const value = load()
        let allowed = true
        if (checked) {
          const result = await Promise.all([checked, value])
          allowed = result[0]
          source = result[1]
        } else source = typeof value === 'string' ? value : await value
        if (!current() || !allowed) return
        wordStarted = Date.now()
        wordSourceGeneration = generation
        word.src = source
        if (typeof word.playbackRate === 'number') word.playbackRate = DEFAULT_PLAYBACK_RATE
        if (wordSourceGeneration === generation) word.play()
      } catch (reason) {
        failed(reason, run)
      }
    }
    await attempt()
  }
  /** 只停止指定弹窗的词音轨，不改变完整音频的位置、倍率或播放意图
   * @param id 要关闭或切换的弹窗受控目标编号
   */
  const stopWord = (id: string) => {
    if (!alive || state.wordId !== id) return
    wordCancelled()
    cancelWordRecovery()
    wordGeneration++
    wordSourceGeneration = 0
    word.stop()
    state.wordId = null
    state.wordStatus = AudioStatus.IDLE
    state.wordError = ''
    notify()
  }
  /** 拖动只改变位置，保留播放或暂停状态
   * @param seconds 用户选择的秒数
   */
  const seekFull = (seconds: number) => {
    if (!alive || !Number.isFinite(seconds)) return
    state.position = Math.max(0, Math.min(seconds, state.duration || full.duration || 0))
    if (ratePausing || fullStarting) pendingSeek = state.position
    full.seek(state.position)
    notify()
  }
  /** 离开场景时销毁音轨并取消所有未返回的资源请求 */
  const dispose = () => {
    if (!alive) return
    alive = false
    wordCancelled()
    cancelWordRecovery()
    fullIntent = false
    pendingRate = null
    fullGeneration++
    wordGeneration++
    full.stop()
    word.stop()
    full.destroy()
    word.destroy()
  }
  return { prepareFull, toggleFull, playWord, stopWord, seekFull, setRate, dispose, state }
}
