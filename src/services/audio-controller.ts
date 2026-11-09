import {
  learningAudioSession,
  resetLearningAudioSession as resetSession
} from '@/features/learning/learning-audio-session'
import { wordAudioRecovery } from '@/services/errors'
import { nativeDiagnosticInstance, recordNativeDiagnostic } from '@/services/native-diagnostics'
import { recordWordAudio } from '@/services/word-audio-diagnostics'
import { DEFAULT_PLAYBACK_RATE, PLAYBACK_RATES } from '@/shared/constants/audio'
import { WORD_AUDIO_RECOVERY_DELAYS } from '@/shared/constants/media'
// #ifdef JUYA_ANALYTICS
import { AnalyticsEvent } from '@/shared/enums/analytics'
// #endif
import { AudioStatus } from '@/shared/enums/audio'

import type { AudioActionOrigin, AudioAnalyticsObserver } from '@/shared/types/analytics'
import type {
  AudioPort,
  AudioState,
  LearningAudioSession,
  PlaybackRate
} from '@/shared/types/audio'
import type { NativeDiagnosticOperation } from '@/shared/types/native-diagnostics'

/** 从应用共享音频入口结束本轮倍速会话，保证分包前已加载控制器 */
export const resetLearningAudioSession = () => {
  resetSession()
}

/** 用两条底层音轨实现完整音频与词汇的互斥播放
 * @param full 当前场景完整音频播放器
 * @param word 独立词汇播放器
 * @param changed 页面状态更新端口
 * @param speedSession 本轮学习共享的内存倍速
 * @param wordFailed 原生播放失败时清除对应词汇的预加载资源
 * @param fullFailed 完整音频播放失败时清除缓存并重新签发地址
 * @param wordCancelled 切换音轨时释放列表与弹窗共用的前台准备通道
 * @param analyticsObserver 当前统计构建的安全操作观察端口，不接收音源地址
 */
export const createAudioController = (
  full: AudioPort,
  word: AudioPort,
  changed: (state: AudioState) => void = () => {},
  speedSession: LearningAudioSession = learningAudioSession,
  wordFailed: (id: string) => void = () => {},
  fullFailed: () => void = () => {},
  wordCancelled: () => void = () => {},
  analyticsObserver?: AudioAnalyticsObserver
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
  // #ifdef JUYA_ANALYTICS
  /** 观察音频操作而不影响原有播放，恢复进度不算主动点击
   * @param event 当前点击或最终播放结果
   * @param kind 完整音频或单词音轨
   * @param origin 主动控制、系统续播、原生结果或静默恢复
   * @param wordId 单词稳定编号或正文位置引用
   * @param value 用户本次选择的位置或倍率
   */
  const record = (
    event: AnalyticsEvent,
    kind: 'full' | 'word' = 'full',
    origin: AudioActionOrigin | 'native' = 'native',
    wordId?: string,
    value?: number
  ) => {
    if (origin === 'restore') return
    try {
      analyticsObserver?.(event, {
        audio_kind: kind,
        trigger: origin,
        ...(kind === 'word'
          ? { word_id: wordId }
          : {
              position_s: event === AnalyticsEvent.AUDIO_SEEK ? value : state.position,
              audio_duration_s: state.duration,
              playback_rate: event === AnalyticsEvent.AUDIO_RATE_CHANGE ? value : state.rate
            })
      })
    } catch {
      /* 观察端口失败不能改变播放和权限流程 */
    }
  }
  /** 记录前台系统面板暂停，主动暂停与切速、词音轨互斥不重复计入 */
  const recordSystemPause = () => {
    if (state.status === AudioStatus.PLAYING && fullIntent && !ratePausing && !fullStarting)
      record(AnalyticsEvent.AUDIO_PAUSE, 'full', 'system')
  }
  // #endif
  let alive = true,
    fullSource = '',
    fullGeneration = 0,
    wordGeneration = 0,
    wordSourceGeneration = 0,
    pendingSeek = 0,
    fullIntent = false,
    fullStarting = false,
    ratePausing = false,
    rateRebinding = false,
    stagedRate: PlaybackRate | null = null,
    pendingRate: PlaybackRate | null = null,
    wordRecover: ((reason: unknown) => void) | null = null,
    wordRetryTimer: ReturnType<typeof setTimeout> | undefined,
    wordStarted = 0,
    diagnosticSignature = ''
  const diagnosticController =
      import.meta.env.VITE_NATIVE_DIAGNOSTICS === 'true'
        ? nativeDiagnosticInstance('controller', state)
        : 0,
    diagnosticPort =
      import.meta.env.VITE_NATIVE_DIAGNOSTICS === 'true'
        ? nativeDiagnosticInstance('port', full)
        : 0
  /** 仅临时诊断记录控制器的实际播放意图和状态
   * @param operation 当前公开动作或原生回调边界
   * @param phase 动作调用或回调的前后阶段
   */
  const diagnoseController = (operation: NativeDiagnosticOperation, phase: 'before' | 'after') => {
    if (import.meta.env.VITE_NATIVE_DIAGNOSTICS === 'true')
      recordNativeDiagnostic('controller-state', {
        controller: diagnosticController,
        port: diagnosticPort,
        operation,
        phase,
        alive,
        fullIntent,
        fullStarting,
        ratePausing,
        rateRebinding,
        pendingRate,
        stagedRate,
        audioStatus: state.status,
        rate: state.rate,
        position: state.position
      })
  }
  /** 仅诊断构建装饰已有动作，保留原始返回值、异常与异步调用语义
   * @param operation 当前公开动作或原生回调边界
   * @param action 原有处理器，不插入额外播放或暂停操作
   */
  const observe =
    <Args extends unknown[], Result>(
      operation: NativeDiagnosticOperation,
      action: (...args: Args) => Result
    ) =>
    (...args: Args): Result => {
      diagnoseController(operation, 'before')
      try {
        return action(...args)
      } finally {
        diagnoseController(operation, 'after')
      }
    }
  /** 取消本次点读恢复任务，离页或切词后不再启动旧音源 */
  const cancelWordRecovery = () => {
    clearTimeout(wordRetryTimer)
    wordRecover = null
  }
  /** 输出当前可信音频状态 */
  const notify = () => {
    if (import.meta.env.VITE_NATIVE_DIAGNOSTICS === 'true') {
      // 媒体位置更新不重复上报，只保留真正的控制状态变化
      const signature = JSON.stringify([
        alive,
        fullIntent,
        fullStarting,
        ratePausing,
        rateRebinding,
        pendingRate,
        stagedRate,
        state.status,
        state.rate
      ])
      if (signature !== diagnosticSignature) {
        diagnosticSignature = signature
        diagnoseController('notify', 'after')
      }
    }
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
    if (import.meta.env.VITE_NATIVE_DIAGNOSTICS === 'true') diagnoseController('start', 'before')
    fullStarting = true
    full.play()
    if (import.meta.env.VITE_NATIVE_DIAGNOSTICS === 'true') diagnoseController('start', 'after')
  }
  /** 等待原生暂停确认后切速，多次选择只应用最后一次 */
  const pauseForRate = () => {
    ratePausing = true
    pendingSeek = Number.isFinite(full.currentTime) ? full.currentTime : state.position
    state.position = pendingSeek
    full.pause()
  }
  /** 原生背景音轨静默重绑倍率，等待下一次真实播放回调确认
   * @param rate 用户最后选择的有效倍率
   */
  const stageRate = (rate: PlaybackRate) => {
    stagedRate = rate
    rateRebinding = !!full.stagePlaybackRate?.(rate)
    if (rateRebinding) {
      pendingRate = rate
      state.pendingRate = rate
    } else {
      pendingRate = null
      delete state.pendingRate
      confirmRate(rate)
    }
  }
  /** 播放中排队切速，暂停时直接设置且不主动播放
   * @param rate 用户最后选择的完整音频倍率
   * @param origin 主动选择或恢复已有档位
   */
  const setRate = (rate: number, origin: AudioActionOrigin = 'control') => {
    if (!alive) return false
    if (!PLAYBACK_RATES.includes(rate as PlaybackRate)) return confirmRate(rate)
    // #ifdef JUYA_ANALYTICS
    record(AnalyticsEvent.AUDIO_RATE_CHANGE, 'full', origin, undefined, rate)
    // #endif
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
    if (full.stagePlaybackRate && rate !== state.rate) {
      stageRate(rate as PlaybackRate)
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
  if (import.meta.env.VITE_NATIVE_DIAGNOSTICS === 'true') {
    const callbacks: [NativeDiagnosticOperation, 'onPlay' | 'onPause' | 'onStop'][] = [
      ['native-play', 'onPlay'],
      ['native-pause', 'onPause'],
      ['native-stop', 'onStop']
    ]
    for (const [operation, method] of callbacks) {
      const subscribe = full[method]
      if (subscribe) full[method] = (callback) => subscribe(observe(operation, callback))
    }
    diagnoseController('create', 'after')
  }
  full.onPlay(() => {
    if (!alive) return
    fullStarting = false
    // 原生晚到的播放事件不能覆盖用户暂停、词汇点读或尚未确认的切速
    if (!fullIntent) {
      full.pause()
      return
    }
    if (rateRebinding && pendingRate !== null && pendingRate !== stagedRate) {
      pauseForRate()
      return
    }
    const confirmingRate = rateRebinding && pendingRate !== null
    if (confirmingRate) {
      const rate = pendingRate!
      pendingRate = null
      rateRebinding = false
      delete state.pendingRate
      confirmRate(rate)
    } else if (pendingRate !== null && pendingRate !== state.rate) {
      if (!ratePausing) pauseForRate()
      return
    }
    pendingRate = null
    state.status = AudioStatus.PLAYING
    if (!confirmingRate) restoreRate()
    if (pendingSeek > 0) {
      full.seek(pendingSeek)
      pendingSeek = 0
    }
    notify()
  })
  full.onPause(() => {
    if (!alive) return
    // #ifdef JUYA_ANALYTICS
    recordSystemPause()
    // #endif
    if (full.background) fullStarting = false
    state.status = AudioStatus.PAUSED
    ratePausing = false
    if (pendingRate !== null) {
      const rate = pendingRate
      pendingRate = null
      if (full.stagePlaybackRate) stageRate(rate)
      else confirmRate(rate)
      if (fullIntent) startFull()
    } else if (!fullStarting) {
      fullIntent = false
      fullGeneration++
    }
    notify()
  })
  full.onStop?.(() => {
    if (!alive) return
    // #ifdef JUYA_ANALYTICS
    recordSystemPause()
    // #endif
    fullGeneration++
    fullIntent = false
    fullStarting = false
    ratePausing = false
    pendingRate = null
    rateRebinding = false
    delete state.pendingRate
    pendingSeek = state.position
    state.status = AudioStatus.PAUSED
    notify()
  })
  full.onEnded(() => {
    if (!alive) return
    state.status = AudioStatus.ENDED
    fullIntent = false
    fullStarting = false
    pendingRate = null
    rateRebinding = false
    delete state.pendingRate
    state.position = state.duration
    // #ifdef JUYA_ANALYTICS
    record(AnalyticsEvent.AUDIO_ENDED)
    // #endif
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
    rateRebinding = false
    delete state.pendingRate
    state.error = '音频暂不可用，点击重试'
    // #ifdef JUYA_ANALYTICS
    record(AnalyticsEvent.AUDIO_ERROR)
    // #endif
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
    // #ifdef JUYA_ANALYTICS
    record(AnalyticsEvent.AUDIO_ENDED, 'word', 'native', state.wordId || undefined)
    // #endif
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
   * @param origin 页面点击或系统媒体续播
   */
  const toggleFull = async (
    load: () => string | Promise<string>,
    origin: AudioActionOrigin = 'control'
  ) => {
    if (!alive || state.status === AudioStatus.LOADING) return
    if (fullIntent) {
      // #ifdef JUYA_ANALYTICS
      record(AnalyticsEvent.AUDIO_PAUSE, 'full', origin)
      // #endif
      fullIntent = false
      full.pause()
      return
    }
    // #ifdef JUYA_ANALYTICS
    record(AnalyticsEvent.AUDIO_PLAY, 'full', origin)
    // #endif
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
      if (!rateRebinding) restoreRate()
      // 背景播放器绑定地址即自动播放，须提前设置原生开始位置
      if (full.background) full.seek(pendingSeek)
      startFull()
    } catch {
      if (alive && generation === fullGeneration) {
        state.status = AudioStatus.ERROR
        fullIntent = false
        state.error = '音频暂不可用，点击重试'
        // #ifdef JUYA_ANALYTICS
        record(AnalyticsEvent.AUDIO_ERROR)
        // #endif
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
    // #ifdef JUYA_ANALYTICS
    record(AnalyticsEvent.AUDIO_PLAY, 'word', 'control', id)
    // #endif
    fullGeneration++
    const cancelFull = fullIntent || fullStarting || ratePausing
    fullIntent = false
    pendingRate = null
    rateRebinding = false
    delete state.pendingRate
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
        // #ifdef JUYA_ANALYTICS
        record(AnalyticsEvent.AUDIO_ERROR, 'word', 'native', id)
        // #endif
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
   * @param origin 主动拖动或恢复页面快照
   */
  const seekFull = (seconds: number, origin: AudioActionOrigin = 'control') => {
    if (!alive || !Number.isFinite(seconds)) return
    state.position = Math.max(0, Math.min(seconds, state.duration || full.duration || 0))
    // #ifdef JUYA_ANALYTICS
    record(AnalyticsEvent.AUDIO_SEEK, 'full', origin, undefined, state.position)
    // #endif
    if (ratePausing || fullStarting) pendingSeek = state.position
    full.seek(state.position)
    notify()
  }
  /** 恢复前台时读取原生时钟和暂停状态，不自动播放或重载音源 */
  const refreshFull = () => {
    if (!alive || state.status === AudioStatus.IDLE || state.status === AudioStatus.LOADING) return
    if (Number.isFinite(full.currentTime)) state.position = full.currentTime
    if (Number.isFinite(full.duration) && full.duration > 0) state.duration = full.duration
    if (
      typeof full.paused === 'boolean' &&
      state.status !== AudioStatus.ENDED &&
      state.status !== AudioStatus.ERROR
    ) {
      fullIntent = !full.paused
      state.status = full.paused ? AudioStatus.PAUSED : AudioStatus.PLAYING
    }
    notify()
  }
  /** 取消未返回的整篇播放请求并保留当前断点 */
  const pauseFull = () => {
    if (!alive) return
    fullGeneration++
    fullIntent = false
    pendingRate = null
    rateRebinding = false
    delete state.pendingRate
    full.pause()
    state.status = AudioStatus.PAUSED
    notify()
  }
  /** 原生文档打开前暂停所有音轨并取消在途播放，保留真实时钟和倍率 */
  const suspend = () => {
    if (!alive) return
    refreshFull()
    pauseFull()
    if (state.wordId) stopWord(state.wordId)
    else {
      wordCancelled()
      cancelWordRecovery()
      wordGeneration++
      wordSourceGeneration = 0
      word.stop()
    }
  }
  /** 离开场景时销毁音轨并取消所有未返回的资源请求 */
  const dispose = () => {
    if (!alive) return
    alive = false
    wordCancelled()
    cancelWordRecovery()
    fullIntent = false
    pendingRate = null
    rateRebinding = false
    delete state.pendingRate
    fullGeneration++
    wordGeneration++
    full.stop()
    word.stop()
    full.destroy()
    word.destroy()
  }
  const controller = {
    prepareFull,
    toggleFull,
    playWord,
    stopWord,
    seekFull,
    setRate,
    refreshFull,
    pauseFull,
    suspend,
    dispose,
    state
  }
  if (import.meta.env.VITE_NATIVE_DIAGNOSTICS === 'true') {
    controller.toggleFull = observe('toggle', toggleFull)
    controller.setRate = observe('set-rate', setRate)
    controller.refreshFull = observe('refresh', refreshFull)
    controller.pauseFull = observe('pause', pauseFull)
    controller.suspend = observe('suspend', suspend)
  }
  return controller
}
