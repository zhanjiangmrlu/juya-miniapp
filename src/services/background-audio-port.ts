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
    pausing = false
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
  const events: BackgroundAudioEvents = {
    play: () => {
      if (!active() || native.paused) return
      if (starting) {
        starting = false
        for (const callback of plays) callback()
        return
      }
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
      if (!active() || !native.paused) return
      capture()
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
            await options.resume(() => active() && run === revision)
          } catch {
            if (active() && run === revision) port.pause()
          }
        })
    },
    stop: () => {
      if (!active() || !native.paused) return
      bound = false
      starting = false
      revision++
      for (const callback of stops) callback()
    },
    ended: () => {
      if (!active() || !native.paused) return
      capture()
      bound = false
      starting = false
      revision++
      for (const callback of ends) callback()
    },
    time: () => {
      if (!active()) return
      capture()
      for (const callback of times) callback()
    },
    error: (reason) => {
      if (!active()) return
      capture()
      bound = false
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
    play: () => {
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
      if (!active()) return
      revision++
      starting = false
      pausing = true
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
      get: () => (active() && bound ? native.playbackRate : rate),
      set: (value: number) => {
        rate = value
        if (active() && bound) native.playbackRate = value
      }
    }
  })
  return port
}
