import {
  nativeDiagnosticNow,
  nativeErrorFields,
  recordNativeDiagnostic
} from '@/services/native-diagnostics'

import type {
  AudioFailure,
  AudioPort,
  BackgroundAudioEvents,
  BackgroundAudioNative,
  FullAudioOptions
} from '@/shared/types/audio'

const managers = new WeakMap<BackgroundAudioNative, { owner?: BackgroundAudioEvents }>()

/** 将微信单例的监听永久复用，仅向当前有效会话转发
 * @param native 微信全局背景播放器
 */
const routerFor = (native: BackgroundAudioNative) => {
  const existing = managers.get(native)
  if (existing) return existing
  const router: { owner?: BackgroundAudioEvents } = {}
  managers.set(native, router)
  native.onPlay(() => router.owner?.play())
  native.onPause(() => router.owner?.pause())
  native.onStop(() => router.owner?.stop())
  native.onEnded(() => router.owner?.ended())
  native.onTimeUpdate(() => router.owner?.time())
  native.onError((reason: AudioFailure) => router.owner?.error(reason))
  return router
}

/** 把设置音源即播放的背景单例转换为可静默准备的页面音轨
 * @param native 微信全局背景播放器
 * @param options 页面标题、外部续播验权及会话替换清理
 */
export const createBackgroundAudioPort = (
  native: BackgroundAudioNative,
  options: FullAudioOptions
): AudioPort => {
  const router = routerFor(native)
  router.owner?.release()
  let alive = true,
    source = '',
    bound = false,
    position = 0,
    rate = 1,
    revision = 0,
    starting = false,
    holding = false,
    heldRevision = 0,
    pausing = false,
    sampleAt = 0,
    samplePosition = 0,
    samples = 0,
    running = false,
    discardedStops = 0
  const plays = new Set<() => void>(),
    pauses = new Set<() => void>(),
    stops = new Set<() => void>(),
    ends = new Set<() => void>(),
    times = new Set<() => void>(),
    errors = new Set<(reason?: AudioFailure) => void>()
  /** 确认原生回调和异步验权仍属于同一播放器 */
  const active = () => alive && router.owner === events
  /** 保存后台读取的真实秒数，不把系统停止后的零位置覆盖到断点 */
  const capture = () => {
    if (bound && Number.isFinite(native.currentTime)) position = native.currentTime
  }
  /** 记录播放器边界状态，临时诊断构建外不执行
   * @param event 固定的原生或命令事件名
   */
  const diagnose = (event: string) => {
    if (import.meta.env.VITE_NATIVE_DIAGNOSTICS === 'true')
      recordNativeDiagnostic(event, {
        paused: native.paused,
        bound,
        starting,
        holding,
        pausing,
        revision,
        rate: native.playbackRate,
        position: native.currentTime
      })
  }
  const events: BackgroundAudioEvents = {
    play: () => {
      diagnose('native-play')
      if (!active() || native.paused) return
      if (starting) {
        starting = false
        running = true
        for (const callback of plays) callback()
        return
      }
      if (running) return
      // 外部播放已经由系统发起，立即暂停，验权后再由控制器启动
      if (pausing) {
        native.pause()
        return
      }
      heldRevision = ++revision
      holding = true
      native.pause()
    },
    pause: () => {
      diagnose('native-pause')
      if (!active() || !native.paused) return
      capture()
      running = false
      starting = false
      pausing = false
      const run = holding ? heldRevision : 0
      if (!holding) revision++
      holding = false
      heldRevision = 0
      for (const callback of pauses) callback()
      if (run)
        void Promise.resolve().then(async () => {
          if (!active() || run !== revision) return
          try {
            diagnose('resume-start')
            await options.resume(() => active() && run === revision)
            diagnose('resume-end')
          } catch {
            if (active() && run === revision) port.pause()
          }
        })
    },
    stop: () => {
      diagnose('native-stop')
      if (discardedStops) {
        discardedStops--
        return
      }
      if (!active() || !native.paused) return
      bound = false
      running = false
      starting = false
      revision++
      for (const callback of stops) callback()
    },
    ended: () => {
      diagnose('native-ended')
      if (!active() || !native.paused) return
      capture()
      bound = false
      running = false
      starting = false
      revision++
      for (const callback of ends) callback()
    },
    time: () => {
      if (
        import.meta.env.VITE_NATIVE_DIAGNOSTICS === 'true' &&
        samples < 8 &&
        nativeDiagnosticNow() - sampleAt >= 1000
      ) {
        recordNativeDiagnostic('native-time', {
          position: native.currentTime,
          rate: native.playbackRate,
          paused: native.paused,
          delta: native.currentTime - samplePosition,
          elapsed: sampleAt ? nativeDiagnosticNow() - sampleAt : 0
        })
        sampleAt = nativeDiagnosticNow()
        samplePosition = native.currentTime
        samples++
      }
      if (!active()) return
      capture()
      for (const callback of times) callback()
    },
    error: (reason) => {
      if (import.meta.env.VITE_NATIVE_DIAGNOSTICS === 'true')
        recordNativeDiagnostic('native-error', nativeErrorFields(reason))
      if (!active()) return
      capture()
      bound = false
      running = false
      starting = false
      revision++
      for (const callback of errors) callback(reason)
    },
    release: () => {
      port.destroy()
      options.leave()
    }
  }
  router.owner = events
  const port: AudioPort = {
    background: true,
    src: '',
    currentTime: 0,
    duration: 0,
    playbackRate: 1,
    prepare: (src) => {
      if (active()) source = src
    },
    stagePlaybackRate: (value) => {
      if (import.meta.env.VITE_NATIVE_DIAGNOSTICS === 'true') {
        recordNativeDiagnostic('rate-stage', {
          requested: value,
          previous: native.playbackRate,
          bound
        })
        sampleAt = nativeDiagnosticNow()
        samplePosition = native.currentTime
        samples = 0
      }
      if (!active()) return false
      rate = value
      if (
        bound &&
        typeof native.playbackRate === 'number' &&
        Math.abs(native.playbackRate - value) < 0.001
      )
        return false
      // iPhone 已绑定音源时忽略倍率写入，先静默停止，下一次显式播放重绑后回读确认
      capture()
      if (bound) {
        bound = false
        running = false
        starting = false
        discardedStops++
        native.stop()
      }
      return true
    },
    play: () => {
      diagnose('port-play')
      if (!active() || !source) return
      revision++
      starting = true
      pausing = false
      native.title = options.title
      native.playbackRate = rate
      if (!bound || native.src !== source) {
        native.startTime = position
        bound = true
        native.src = source
      } else native.play()
    },
    pause: () => {
      diagnose('port-pause')
      if (!active()) return
      revision++
      starting = false
      pausing = true
      running = false
      capture()
      native.pause()
    },
    stop: () => {
      if (!active()) return
      revision++
      starting = false
      bound = false
      position = 0
      native.stop()
    },
    seek: (seconds) => {
      if (!active() || !Number.isFinite(seconds)) return
      position = Math.max(0, seconds)
      if (bound) native.seek(position)
    },
    destroy: () => {
      if (!active()) return
      alive = false
      revision++
      router.owner = undefined
      native.stop()
      plays.clear()
      pauses.clear()
      stops.clear()
      ends.clear()
      times.clear()
      errors.clear()
    },
    onPlay: (cb) => plays.add(cb),
    onPause: (cb) => pauses.add(cb),
    onStop: (cb) => stops.add(cb),
    onEnded: (cb) => ends.add(cb),
    onTimeUpdate: (cb) => times.add(cb),
    onError: (cb) => errors.add(cb)
  }
  Object.defineProperties(port, {
    src: {
      get: () => source,
      set: (value: string) => {
        if (active()) source = value
      }
    },
    currentTime: {
      get: () => {
        if (active()) capture()
        return position
      }
    },
    duration: { get: () => (active() && bound ? native.duration : 0) },
    paused: { get: () => !active() || native.paused },
    playbackRate: {
      get: () => {
        const value = active() && bound ? native.playbackRate : rate
        if (import.meta.env.VITE_NATIVE_DIAGNOSTICS === 'true')
          recordNativeDiagnostic('rate-read', { rate: value, bound })
        return value
      },
      set: (value: number) => {
        if (import.meta.env.VITE_NATIVE_DIAGNOSTICS === 'true') {
          recordNativeDiagnostic('rate-write', {
            requested: value,
            previous: native.playbackRate,
            bound
          })
          sampleAt = nativeDiagnosticNow()
          samplePosition = native.currentTime
          samples = 0
        }
        rate = value
        if (active() && bound) native.playbackRate = value
      }
    }
  })
  return port
}
