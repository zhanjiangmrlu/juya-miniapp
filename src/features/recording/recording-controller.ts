import type { RecordingPlaybackEventType } from '@/shared/enums/recording'
import type { RecordingPort, RecordingSnapshot } from '@/shared/types/recording'

import { createBrowserRecordingPort } from './browser-recording-port'
import { createRecordingSnapshot } from './recording-machine'

export type { RecordingPort } from '@/shared/types/recording'

/** 管理逐句录音权限、临时文件与回听生命周期 */
export class RecordingController {
  private permission: boolean | undefined
  private permissionRequest?: Promise<boolean>
  private recordings = new Map<string, string>()
  private state = createRecordingSnapshot()
  private generation = 0
  private pendingStop?: Promise<void>
  private pendingStart?: Promise<void>
  private unsubscribe?: () => void
  private unsubscribeRecording?: () => void
  private playbackRequested = false
  private disposed = false

  /** port 为本地录音设备端口，onChange 为页面快照回调 */
  constructor(
    private readonly port: RecordingPort,
    private readonly onChange?: (snapshot: RecordingSnapshot) => void
  ) {
    this.unsubscribe = port.subscribePlayback?.((type) => {
      if (this.disposed || !this.playbackRequested) return
      if (type === 'play') this.update({ ...this.state, status: 'PLAYBACK' })
      else if (type === 'pause') this.update({ ...this.state, status: 'PAUSED' })
      else if (type === 'ended') this.update({ ...this.state, status: 'RECORDED' })
      else this.update({ ...this.state, status: 'FAILED' })
    })
    this.unsubscribeRecording = port.subscribeRecording?.((path) => {
      const id = this.state.selectedSentenceId
      if (this.disposed || !id || this.state.status !== 'RECORDING') return
      if (!path) {
        this.update({ ...this.state, status: 'FAILED' })
        return
      }
      const previous = this.recordings.get(id)
      if (previous && previous !== path) void port.deleteFile(previous)
      this.recordings.set(id, path)
      this.update({ ...this.state, hasRecording: true, status: 'RECORDED' })
    })
  }

  get snapshot(): RecordingSnapshot {
    return this.state
  }

  /** 选择句子，id 为稳定句子标识，旧录音停止后仍归属于旧句 */
  selectSentence = async (id: string): Promise<void> => {
    this.stopPlayback()
    const stopping = this.stop()
    this.generation++
    this.update({
      ...this.state,
      selectedSentenceId: id,
      hasRecording: this.recordings.has(id),
      status: 'IDLE'
    })
    await stopping
  }

  /** 首次开始录音时请求权限，拒绝后只禁用录音能力 */
  start = async (): Promise<void> => {
    const sentenceId = this.state.selectedSentenceId
    if (
      !sentenceId ||
      this.state.recordingDisabled ||
      this.disposed ||
      this.pendingStart ||
      this.state.status === 'RECORDING'
    )
      return
    const generation = ++this.generation
    await this.pendingStop
    if (generation !== this.generation || this.disposed) return
    if (this.permission === undefined) {
      this.permissionRequest ??= this.port.requestPermission().catch(() => false)
      this.permission = await this.permissionRequest
    }
    if (generation !== this.generation || this.disposed) return
    if (!this.permission) {
      this.update({ ...this.state, recordingDisabled: true, status: 'DENIED' })
      return
    }
    this.stopPlayback()
    this.pendingStart = this.startDevice(sentenceId, generation).finally(() => {
      this.pendingStart = undefined
    })
    await this.pendingStart
  }

  /** 启动当前句设备，sentenceId 为录音归属句，generation 为取消后的清理校验代次 */
  private startDevice = async (sentenceId: string, generation: number): Promise<void> => {
    try {
      await this.port.start(sentenceId)
      if (generation !== this.generation || this.disposed) {
        const path = await this.port.stop()
        await this.port.deleteFile(path)
        return
      }
      this.update({ ...this.state, status: 'RECORDING' })
    } catch {
      if (generation === this.generation && !this.disposed)
        this.update({ ...this.state, status: 'FAILED' })
    }
  }

  /** 停止录音并保留文件在开始录制的句子下 */
  stop = (): Promise<void> => {
    // 即使设备尚未启动，也取消等待授权或启动回调中的录音意图
    this.generation++
    if (this.pendingStart) return this.pendingStart
    if (this.pendingStop) return this.pendingStop
    const sentenceId = this.state.selectedSentenceId
    if (!sentenceId || this.state.status !== 'RECORDING') return Promise.resolve()
    this.pendingStop = this.port
      .stop()
      .then(async (path) => {
        const previous = this.recordings.get(sentenceId)
        if (previous && previous !== path) await this.port.deleteFile(previous)
        this.recordings.set(sentenceId, path)
        if (
          this.state.selectedSentenceId === sentenceId &&
          this.state.status === 'RECORDING' &&
          !this.disposed
        )
          this.update({ ...this.state, hasRecording: true, status: 'RECORDED' })
      })
      .catch(() => {
        if (
          this.state.selectedSentenceId === sentenceId &&
          this.state.status === 'RECORDING' &&
          !this.disposed
        )
          this.update({ ...this.state, status: 'FAILED' })
      })
      .finally(() => {
        this.pendingStop = undefined
      })
    return this.pendingStop
  }

  /** 回听当前句最近录音，设备事件决定实际播放状态 */
  playback = async (): Promise<void> => {
    if (this.pendingStart) return
    if (this.state.status === 'PLAYBACK') {
      this.port.pausePlayback?.()
      return
    }
    const sentenceId = this.state.selectedSentenceId
    const path = sentenceId ? this.recordings.get(sentenceId) : undefined
    if (!path || this.disposed || this.state.status === 'RECORDING') return
    const generation = this.generation
    this.playbackRequested = true
    try {
      await this.port.playback(path)
      if (generation !== this.generation || this.disposed) return
      if (!this.port.subscribePlayback) this.update({ ...this.state, status: 'PLAYBACK' })
    } catch {
      if (generation === this.generation && !this.disposed)
        this.update({ ...this.state, status: 'FAILED' })
    }
  }

  /** 停止本地回听，供切句和原音互斥使用 */
  stopPlayback = (): void => {
    this.playbackRequested = false
    this.port.stopPlayback()
    if (this.state.status === 'PLAYBACK' || this.state.status === 'PAUSED')
      this.update({ ...this.state, status: 'RECORDED' })
  }

  /** 删除当前句旧文件后立即开始重录 */
  rerecord = async (): Promise<void> => {
    const sentenceId = this.state.selectedSentenceId
    if (!sentenceId || this.disposed) return
    this.stopPlayback()
    const stopping = this.stop()
    const generation = this.generation
    await stopping
    if (generation !== this.generation || this.disposed) return
    const path = this.recordings.get(sentenceId)
    if (path) {
      await this.port.deleteFile(path)
      this.recordings.delete(sentenceId)
    }
    if (generation !== this.generation || this.disposed) return
    this.update({ ...this.state, hasRecording: false, status: 'IDLE' })
    await this.start()
  }

  /** 停止设备并清理所有本地文件 */
  dispose = async (): Promise<void> => {
    if (this.disposed) return
    this.disposed = true
    this.playbackRequested = false
    this.generation++
    this.port.stopPlayback()
    await this.stop()
    const paths = [...new Set(this.recordings.values())]
    await Promise.all(paths.map((path) => this.port.deleteFile(path)))
    this.recordings.clear()
    this.unsubscribe?.()
    this.unsubscribeRecording?.()
    this.port.destroy?.()
    this.update(createRecordingSnapshot())
  }

  /** 更新录音快照，snapshot 为当前句与本地设备状态 */
  private update = (snapshot: RecordingSnapshot) => {
    this.state = snapshot
    this.onChange?.(snapshot)
  }
}

/** 将微信录音管理器和回听播放器适配为可测试端口 */
export const createUniRecordingPort = (): RecordingPort => {
  // #ifdef H5
  return createBrowserRecordingPort()
  // #endif
  // #ifndef H5
  const recorder = uni.getRecorderManager()
  const playback = uni.createInnerAudioContext()
  let stopResolver: ((path: string) => void) | undefined
  let stopReject: ((error: unknown) => void) | undefined
  let startResolver: (() => void) | undefined
  let startReject: ((error: unknown) => void) | undefined
  let playbackListener: ((type: RecordingPlaybackEventType) => void) | undefined
  let recordingListener: ((path?: string) => void) | undefined
  recorder.onStart(() => {
    startResolver?.()
    startResolver = undefined
    startReject = undefined
  })
  recorder.onStop((result) => {
    if (stopResolver) stopResolver(result.tempFilePath)
    else recordingListener?.(result.tempFilePath)
    stopResolver = undefined
    stopReject = undefined
  })
  recorder.onError((error) => {
    startReject?.(error)
    stopReject?.(error)
    if (!startReject && !stopReject) recordingListener?.()
    startResolver = undefined
    stopResolver = undefined
  })
  playback.onPlay(() => playbackListener?.('play'))
  playback.onPause(() => playbackListener?.('pause'))
  playback.onEnded(() => playbackListener?.('ended'))
  playback.onError(() => playbackListener?.('error'))
  return {
    deleteFile: (path) =>
      new Promise((resolve) => {
        try {
          uni
            .getFileSystemManager()
            .unlink({ fail: () => resolve(), filePath: path, success: () => resolve() })
        } catch {
          resolve()
        }
      }),
    playback: (path) => {
      if (playback.src !== path) playback.src = path
      playback.play()
      return Promise.resolve()
    },
    pausePlayback: () => playback.pause(),
    subscribePlayback: (listener) => {
      playbackListener = listener
      return () => {
        playbackListener = undefined
      }
    },
    subscribeRecording: (listener) => {
      recordingListener = listener
      return () => {
        recordingListener = undefined
      }
    },
    requestPermission: () =>
      new Promise((resolve) => {
        uni.authorize({
          fail: () => resolve(false),
          scope: 'scope.record',
          success: () => resolve(true)
        })
      }),
    start: () =>
      new Promise((resolve, reject) => {
        startResolver = resolve
        startReject = reject
        recorder.start({ duration: RECORDING_MAX_DURATION_MS, format: 'aac' })
      }),
    stop: () =>
      new Promise((resolve, reject) => {
        stopResolver = resolve
        stopReject = reject
        recorder.stop()
      }),
    stopPlayback: () => playback.stop(),
    destroy: () => {
      recordingListener = undefined
      playbackListener = undefined
      playback.destroy()
    }
  }
  // #endif
}
import { RECORDING_MAX_DURATION_MS } from '@/shared/constants/recording'
