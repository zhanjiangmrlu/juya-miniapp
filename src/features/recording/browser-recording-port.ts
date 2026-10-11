import { RECORDING_MAX_DURATION_MS } from '@/shared/constants/recording'
import { RecordingPlaybackEventType } from '@/shared/enums/recording'

import type { RecordingPort } from '@/shared/types/recording'

/** 创建浏览器本地录音端口，音频仅使用当前页对象 URL */
export const createBrowserRecordingPort = (): RecordingPort => {
  let stream: MediaStream | undefined
  let recorder: MediaRecorder | undefined
  let timer: ReturnType<typeof globalThis.setTimeout> | undefined
  let disposed = false
  let recordingListener: ((path?: string) => void) | undefined
  let stopPromise: Promise<string> | undefined
  let stopResolve: ((path: string) => void) | undefined
  let stopReject: ((error: Error) => void) | undefined
  const paths = new Set<string>()
  const player = new Audio()
  let listener: ((type: RecordingPlaybackEventType) => void) | undefined
  player.addEventListener('play', () => listener?.(RecordingPlaybackEventType.PLAY))
  player.addEventListener('pause', () => listener?.(RecordingPlaybackEventType.PAUSE))
  player.addEventListener('ended', () => listener?.(RecordingPlaybackEventType.ENDED))
  player.addEventListener('error', () => listener?.(RecordingPlaybackEventType.ERROR))

  /** 清除本次录音的最长时限计时器 */
  const clearTimer = () => {
    if (timer) globalThis.clearTimeout(timer)
    timer = undefined
  }

  /** 停止设备并返回本次临时对象 URL */
  const stop = (): Promise<string> => {
    if (stopPromise) return stopPromise
    if (disposed || !recorder || recorder.state === 'inactive')
      return Promise.reject(new Error('没有正在录制的音频'))
    clearTimer()
    const device = recorder
    stopPromise = new Promise((resolve, reject) => {
      stopResolve = resolve
      stopReject = reject
      try {
        device.stop()
      } catch {
        reject(new Error('录音设备停止失败'))
      }
    })
    return stopPromise.finally(() => {
      stopPromise = undefined
      stopResolve = undefined
      stopReject = undefined
    })
  }

  return {
    requestPermission: async () => {
      try {
        if (
          disposed ||
          !navigator.mediaDevices?.getUserMedia ||
          typeof MediaRecorder === 'undefined'
        )
          return false
        const granted = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (disposed) {
          granted.getTracks().forEach((track) => track.stop())
          return false
        }
        stream?.getTracks().forEach((track) => track.stop())
        stream = granted
        return true
      } catch {
        return false
      }
    },
    start: async () => {
      if (disposed || !stream || stopPromise) throw new Error('录音设备暂不可用')
      player.pause()
      const chunks: Blob[] = []
      const device = new MediaRecorder(stream)
      recorder = device
      let finished = false
      /** 结束本次设备错误并拒绝待停止请求，不保留不完整录音 */
      const fail = () => {
        if (finished) return
        finished = true
        clearTimer()
        if (stopReject) stopReject(new Error('录音设备失败'))
        else if (!disposed) recordingListener?.()
        try {
          if (device.state === 'recording') device.stop()
        } catch {
          // 设备错误已通知控制器，退出仍会释放麦克风
        }
      }
      device.ondataavailable = (event) => {
        if (!disposed && !finished && event.data.size) chunks.push(event.data)
      }
      device.onerror = fail
      device.onstop = () => {
        if (finished) return
        if (disposed || !chunks.length) {
          fail()
          return
        }
        finished = true
        clearTimer()
        const path = URL.createObjectURL(
          new Blob(chunks, { type: device.mimeType || 'audio/webm' })
        )
        paths.add(path)
        if (stopResolve) stopResolve(path)
        else recordingListener?.(path)
      }
      device.start()
      timer = globalThis.setTimeout(() => {
        void stop().then(
          (path) => recordingListener?.(path),
          () => recordingListener?.()
        )
      }, RECORDING_MAX_DURATION_MS)
    },
    stop,
    /** 回听本次录音，path 为页面创建的临时对象 URL */
    playback: async (path) => {
      if (disposed || !paths.has(path)) throw new Error('本次录音已清理')
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
      clearTimer()
      stopReject?.(new Error('本次录音已清理'))
      try {
        if (recorder?.state === 'recording') recorder.stop()
      } catch {
        // 停止失败不阻断后续麦克风与对象 URL 清理
      }
      stream?.getTracks().forEach((track) => track.stop())
      for (const path of paths) URL.revokeObjectURL(path)
      paths.clear()
    }
  }
}
