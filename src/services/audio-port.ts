import type { AudioPort } from '@/shared/types/audio'

import { runtimeMode } from './runtime-mode'
import { createWordAudioPort } from './word-audio-port'

// #ifdef H5
/** 浏览器直接使用媒体元素，弥补 uni H5 上下文未透传倍率的限制 */
const browserAudioPort = (): AudioPort => {
  const audio = new Audio()
  audio.autoplay = false
  audio.preload = 'metadata'
  audio.preservesPitch = true
  let alive = true,
    request = 0
  const failures = new Set<() => void>()
  /** 只订阅当前未销毁音轨的原生事件
   * @param event 浏览器媒体事件名称
   * @param callback 控制器状态更新回调
   */
  const listen = (event: string, callback: () => void) => {
    audio.addEventListener(event, () => {
      if (alive) callback()
    })
  }
  /** 主动暂停并撤销尚未开始的播放承诺 */
  const pause = () => {
    request++
    audio.pause()
  }
  /** 保持秒数时间轴，不自动触发播放
   * @param seconds 完整音频的原时间轴位置
   */
  const seek = (seconds: number) => {
    if (audio.readyState) audio.currentTime = seconds
    else
      audio.addEventListener(
        'loadedmetadata',
        () => {
          if (alive) audio.currentTime = seconds
        },
        { once: true }
      )
  }
  const port: AudioPort = {
    src: '',
    currentTime: 0,
    duration: 0,
    playbackRate: 1,
    prepare: (src) => {
      audio.preload = 'auto'
      audio.src = src
      audio.load()
    },
    play: () => {
      const generation = ++request
      void audio.play().catch(() => {
        if (alive && request === generation) for (const callback of failures) callback()
      })
    },
    pause,
    stop: () => {
      pause()
      if (audio.readyState) audio.currentTime = 0
    },
    seek,
    destroy: () => {
      alive = false
      pause()
      failures.clear()
      audio.removeAttribute('src')
      audio.load()
    },
    onPlay: (callback) => listen('play', callback),
    onPause: (callback) => listen('pause', callback),
    onEnded: (callback) => listen('ended', callback),
    onTimeUpdate: (callback) => listen('timeupdate', callback),
    onError: (callback) => {
      failures.add(callback)
      listen('error', callback)
    }
  }
  Object.defineProperties(port, {
    src: {
      get: () => audio.src,
      set: (value: string) => {
        audio.src = value
      }
    },
    currentTime: { get: () => audio.currentTime },
    duration: { get: () => audio.duration },
    playbackRate: {
      get: () => audio.playbackRate,
      set: (value: number) => {
        audio.playbackRate = value
      }
    }
  })
  return port
}
// #endif

/** 为当前平台创建音轨，词汇独立隔离每次切源的迟到回调
 * @param isolateSources 仅词汇音轨启用上下文隔离，整篇音轨保持原行为
 */
export const createAudioPort = (isolateSources = false): AudioPort => {
  runtimeMode.assertPrivate()
  if (isolateSources) return createWordAudioPort(() => createAudioPort())
  // #ifdef H5
  return browserAudioPort()
  // #endif
  // #ifndef H5
  const audio = uni.createInnerAudioContext()
  audio.autoplay = false
  return audio as AudioPort
  // #endif
}
