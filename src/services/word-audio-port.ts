import type { AudioFailure, AudioPort } from '@/shared/types/audio'

/** 为词汇切源隔离原生上下文，旧音源迟到事件不能污染新点读
 * @param create 创建当前平台的单个底层音频上下文
 */
export const createWordAudioPort = (create: () => AudioPort): AudioPort => {
  let track: AudioPort | null = null,
    generation = 0,
    alive = true,
    source = ''
  const plays = new Set<() => void>(),
    pauses = new Set<() => void>(),
    ends = new Set<() => void>(),
    times = new Set<() => void>(),
    errors = new Set<(reason?: AudioFailure) => void>()
  /** 撤销当前上下文的所有迟到事件，再释放原生资源 */
  const release = () => {
    generation++
    const previous = track
    track = null
    previous?.destroy()
  }
  const port: AudioPort = {
    src: '',
    currentTime: 0,
    duration: 0,
    playbackRate: 1,
    play: () => track?.play(),
    pause: () => track?.pause(),
    stop: release,
    seek: (seconds) => track?.seek(seconds),
    destroy: () => {
      alive = false
      release()
      plays.clear()
      pauses.clear()
      ends.clear()
      times.clear()
      errors.clear()
    },
    onPlay: (callback) => plays.add(callback),
    onPause: (callback) => pauses.add(callback),
    onEnded: (callback) => ends.add(callback),
    onTimeUpdate: (callback) => times.add(callback),
    onError: (callback) => errors.add(callback)
  }
  Object.defineProperties(port, {
    src: {
      get: () => source,
      set: (value: string) => {
        release()
        if (!alive) return
        source = value
        const current = create(),
          run = generation
        track = current
        const active = () => alive && track === current && generation === run
        current.onPlay(() => {
          if (active()) for (const cb of plays) cb()
        })
        current.onPause(() => {
          if (active()) for (const cb of pauses) cb()
        })
        current.onEnded(() => {
          if (active()) for (const cb of ends) cb()
        })
        current.onTimeUpdate(() => {
          if (active()) for (const cb of times) cb()
        })
        current.onError((reason) => {
          if (active()) for (const cb of errors) cb(reason)
        })
        current.src = value
      }
    },
    currentTime: { get: () => track?.currentTime || 0 },
    duration: { get: () => track?.duration || 0 },
    playbackRate: {
      get: () => track?.playbackRate ?? 1,
      set: (value: number) => {
        if (track) track.playbackRate = value
      }
    }
  })
  return port
}
