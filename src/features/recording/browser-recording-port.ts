import { RecordingPlaybackEventType } from '@/shared/enums/recording'

import type { RecordingPort } from '@/shared/types/recording'

/** 创建浏览器本地录音端口，音频仅使用当前页对象 URL */
export const createBrowserRecordingPort = (): RecordingPort => {
  let stream: MediaStream | undefined
  let recorder: MediaRecorder | undefined
  let chunks: Blob[] = []
  let timer: ReturnType<typeof globalThis.setTimeout> | undefined
  let disposed = false
  let recordingListener: ((path?: string) => void) | undefined
  let stopPromise: Promise<string> | undefined
  const paths = new Set<string>()
  const player = new Audio()
  let listener: ((type: RecordingPlaybackEventType) => void) | undefined
  player.addEventListener('play', () => listener?.(RecordingPlaybackEventType.PLAY))
  player.addEventListener('pause', () => listener?.(RecordingPlaybackEventType.PAUSE))
  player.addEventListener('ended', () => listener?.(RecordingPlaybackEventType.ENDED))
  player.addEventListener('error', () => listener?.(RecordingPlaybackEventType.ERROR))

  /** 停止设备并返回本次临时对象 URL */
  const stop = (): Promise<string> => {
    if (stopPromise) return stopPromise
    if (!recorder || recorder.state === 'inactive')
      return Promise.reject(new Error('没有正在录制的音频'))
    if (timer) globalThis.clearTimeout(timer)
    const device = recorder
    stopPromise = new Promise((resolve, reject) => {
      device.onstop = () => {
        const path = URL.createObjectURL(
          new Blob(chunks, { type: device.mimeType || 'audio/webm' })
        )
        paths.add(path)
        resolve(path)
      }
      device.onerror = (error) => {
        reject(error)
      }
      device.stop()
    })
    return stopPromise.finally(() => {
      stopPromise = undefined
    })
  }

  return {
    requestPermission: async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined')
          return false
        const granted = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (disposed) {
          granted.getTracks().forEach((track) => track.stop())
          return false
        }
        stream = granted
        return true
      } catch {
        return false
      }
    },
    start: async () => {
      if (!stream) throw new Error('录音权限未开启')
      player.pause()
      chunks = []
      recorder = new MediaRecorder(stream)
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data)
      }
      recorder.start()
      timer = globalThis.setTimeout(() => {
        void stop().then(
          (path) => recordingListener?.(path),
          () => recordingListener?.()
        )
      }, 60_000)
    },
    stop,
    /** 回听本次录音，path 为页面创建的临时对象 URL */
    playback: async (path) => {
      if (player.src !== path) player.src = path
      await player.play()
    },
    stopPlayback: () => {
      player.pause()
      player.currentTime = 0
    },
    pausePlayback: () => player.pause(),
    /** 释放临时录音，path 为已保存的本地对象 URL */
    deleteFile: async (path) => {
      URL.revokeObjectURL(path)
      paths.delete(path)
    },
    /** 订阅真实回听事件，next 为页面控制器事件回调 */
    subscribePlayback: (next) => {
      listener = next
      return () => {
        listener = undefined
      }
    },
    /** 订阅录音自动停止，next 接收临时录音地址或设备失败 */
    subscribeRecording: (next) => {
      recordingListener = next
      return () => {
        recordingListener = undefined
      }
    },
    destroy: () => {
      disposed = true
      recordingListener = undefined
      listener = undefined
      player.pause()
      player.src = ''
      if (timer) globalThis.clearTimeout(timer)
      if (recorder?.state === 'recording') recorder.stop()
      stream?.getTracks().forEach((track) => track.stop())
      for (const path of paths) URL.revokeObjectURL(path)
      paths.clear()
    }
  }
}
