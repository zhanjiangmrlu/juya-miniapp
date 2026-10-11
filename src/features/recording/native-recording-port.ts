import { RECORDING_MAX_DURATION_MS } from '@/shared/constants/recording'
import { RecordingPlaybackEventType } from '@/shared/enums/recording'

import type { NativeRecordingCallbacks, RecordingPort } from '@/shared/types/recording'

const recorderListeners = new WeakMap<object, Set<NativeRecordingCallbacks>>()

/** 单例管理器仅绑定一组桥接，recorder 为微信设备，callbacks 为可解除的本次会话监听 */
const subscribeRecorder = (
  recorder: ReturnType<typeof uni.getRecorderManager>,
  callbacks: NativeRecordingCallbacks
) => {
  let listeners = recorderListeners.get(recorder)
  if (!listeners) {
    listeners = new Set<NativeRecordingCallbacks>()
    recorderListeners.set(recorder, listeners)
    const subscribers = listeners
    recorder.onStart(() => subscribers.forEach((next) => next.started()))
    recorder.onStop((result) => subscribers.forEach((next) => next.stopped(result.tempFilePath)))
    recorder.onError((error) => subscribers.forEach((next) => next.failed(error)))
  }
  listeners.add(callbacks)
  const subscribers = listeners
  return () => subscribers.delete(callbacks)
}

/** 创建微信本地录音与回听端口，不上传临时文件 */
export const createNativeRecordingPort = (): RecordingPort => {
  const recorder = uni.getRecorderManager()
  const playback = uni.createInnerAudioContext()
  let stopResolver: ((path: string) => void) | undefined
  let stopReject: ((error: unknown) => void) | undefined
  let startResolver: (() => void) | undefined
  let startReject: ((error: unknown) => void) | undefined
  let playbackListener: ((type: RecordingPlaybackEventType) => void) | undefined
  let recordingListener: ((path?: string) => void) | undefined
  let disposed = false
  let recording = false
  let starting = false
  /** 删除临时文件，path 为当前会话生成的本地路径 */
  const deleteFile = (path: string): Promise<void> =>
    new Promise((resolve) => {
      try {
        uni
          .getFileSystemManager()
          .unlink({ fail: () => resolve(), filePath: path, success: () => resolve() })
      } catch {
        resolve()
      }
    })
  /** 清除已完成或已拒绝的设备请求回调 */
  const clearRequests = () => {
    startResolver = undefined
    startReject = undefined
    stopResolver = undefined
    stopReject = undefined
  }
  const unsubscribe = subscribeRecorder(recorder, {
    started: () => {
      if (!starting) return
      starting = false
      recording = true
      if (disposed) {
        try {
          recorder.stop()
        } catch {
          unsubscribe()
        }
        return
      }
      startResolver?.()
      startResolver = undefined
      startReject = undefined
    },
    stopped: (path) => {
      if (!recording && !stopResolver) return
      recording = false
      if (disposed) {
        if (path) void deleteFile(path)
        clearRequests()
        unsubscribe()
        return
      }
      if (stopResolver) stopResolver(path)
      else if (!disposed) recordingListener?.(path)
      stopResolver = undefined
      stopReject = undefined
    },
    failed: (error) => {
      if (disposed) {
        recording = false
        starting = false
        clearRequests()
        unsubscribe()
        return
      }
      if (!recording && !startReject && !stopReject) return
      startReject?.(error)
      stopReject?.(error)
      if (!startReject && !stopReject) recordingListener?.()
      recording = false
      starting = false
      clearRequests()
    }
  })
  playback.onPlay(() => playbackListener?.(RecordingPlaybackEventType.PLAY))
  playback.onPause(() => playbackListener?.(RecordingPlaybackEventType.PAUSE))
  playback.onEnded(() => playbackListener?.(RecordingPlaybackEventType.ENDED))
  playback.onError(() => playbackListener?.(RecordingPlaybackEventType.ERROR))
  return {
    deleteFile,
    /** 回听当前本地录音，path 为控制器保留的临时文件 */
    playback: (path) => {
      if (disposed) return Promise.reject(new Error('本次录音已清理'))
      if (playback.src !== path) playback.src = path
      playback.play()
      return Promise.resolve()
    },
    /** 暂停当前回听 */
    pausePlayback: () => playback.pause(),
    /** 订阅回听状态，listener 为当前会话状态回调 */
    subscribePlayback: (listener) => {
      playbackListener = listener
      return () => {
        playbackListener = undefined
      }
    },
    /** 订阅录音自动停止或失败，listener 为当前会话临时文件回调 */
    subscribeRecording: (listener) => {
      recordingListener = listener
      return () => {
        recordingListener = undefined
      }
    },
    /** 只申请设备录音权限，不申请后台上传能力 */
    requestPermission: () =>
      new Promise((resolve) => {
        if (disposed) {
          resolve(false)
          return
        }
        uni.authorize({
          fail: () => resolve(false),
          scope: 'scope.record',
          success: () => resolve(true)
        })
      }),
    /** 启动本次设备录音，等待真实开始事件 */
    start: () =>
      new Promise((resolve, reject) => {
        if (disposed || recording || startResolver) {
          reject(new Error('录音设备暂不可用'))
          return
        }
        startResolver = resolve
        startReject = reject
        starting = true
        try {
          recorder.start({ duration: RECORDING_MAX_DURATION_MS, format: 'aac' })
        } catch (error) {
          starting = false
          clearRequests()
          reject(error)
        }
      }),
    /** 停止设备，等待真实停止事件返回本次临时文件 */
    stop: () =>
      new Promise((resolve, reject) => {
        if (disposed || !recording || stopResolver) {
          reject(new Error('没有正在录制的音频'))
          return
        }
        stopResolver = resolve
        stopReject = reject
        try {
          recorder.stop()
        } catch (error) {
          stopResolver = undefined
          stopReject = undefined
          reject(error)
        }
      }),
    /** 停止回听以便切句或播放原音 */
    stopPlayback: () => playback.stop(),
    /** 移除当前会话监听并释放本地回听设备 */
    destroy: () => {
      if (disposed) return
      disposed = true
      startReject?.(new Error('本次录音已清理'))
      stopReject?.(new Error('本次录音已清理'))
      clearRequests()
      // 仍等待设备的迟到开始或停止事件时保留清理回调，文件返回后立即移除
      if (recording) {
        try {
          recorder.stop()
        } catch {
          unsubscribe()
        }
      } else if (!starting) unsubscribe()
      recordingListener = undefined
      playbackListener = undefined
      playback.destroy()
    }
  }
}
