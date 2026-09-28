import { createRecordingSnapshot, type RecordingSnapshot } from './recording-machine'

export interface RecordingPort {
  deleteFile(path: string): Promise<void>
  playback(path: string): Promise<void>
  requestPermission(): Promise<boolean>
  start(sentenceId: string): Promise<void>
  stop(): Promise<string>
  stopPlayback(): void
}

/** 管理逐句录音权限、临时文件与回听生命周期。 */
export class RecordingController {
  private permission: boolean | undefined
  private recordings = new Map<string, string>()
  private state = createRecordingSnapshot()

  constructor(
    private readonly port: RecordingPort,
    private readonly onChange?: (snapshot: RecordingSnapshot) => void
  ) {}

  get snapshot(): RecordingSnapshot {
    return this.state
  }

  /** 选择任意句子，并停止上一句的回听或正在进行的录音。 */
  selectSentence(id: string): void {
    if (this.state.status === 'PLAYBACK') this.port.stopPlayback()
    if (this.state.status === 'RECORDING') void this.stop()
    this.update({ ...this.state, selectedSentenceId: id, status: 'IDLE' })
  }

  /** 首次开始录音时请求权限，拒绝后只禁用录音能力。 */
  async start(): Promise<void> {
    const sentenceId = this.state.selectedSentenceId
    if (!sentenceId || this.state.recordingDisabled) return

    if (this.permission === undefined) this.permission = await this.port.requestPermission()
    if (!this.permission) {
      this.update({ ...this.state, recordingDisabled: true, status: 'DENIED' })
      return
    }

    this.port.stopPlayback()
    await this.port.start(sentenceId)
    this.update({ ...this.state, status: 'RECORDING' })
  }

  /** 停止录音并保存当前句子的临时文件引用。 */
  async stop(): Promise<void> {
    const sentenceId = this.state.selectedSentenceId
    if (!sentenceId || this.state.status !== 'RECORDING') return
    const path = await this.port.stop()
    this.recordings.set(sentenceId, path)
    this.update({ ...this.state, status: 'RECORDED' })
  }

  /** 回听当前句最近一次录音。 */
  async playback(): Promise<void> {
    const sentenceId = this.state.selectedSentenceId
    const path = sentenceId ? this.recordings.get(sentenceId) : undefined
    if (!path) return
    await this.port.playback(path)
    this.update({ ...this.state, status: 'PLAYBACK' })
  }

  /** 删除当前句旧文件后立即开始重录。 */
  async rerecord(): Promise<void> {
    const sentenceId = this.state.selectedSentenceId
    if (!sentenceId) return
    const path = this.recordings.get(sentenceId)
    if (path) {
      await this.port.deleteFile(path)
      this.recordings.delete(sentenceId)
    }
    this.update({ ...this.state, status: 'IDLE' })
    await this.start()
  }

  /** 停止设备资源并清理所有本地临时录音。 */
  async dispose(): Promise<void> {
    this.port.stopPlayback()
    const paths = [...new Set(this.recordings.values())]
    await Promise.all(paths.map(async (path) => this.port.deleteFile(path)))
    this.recordings.clear()
    this.update(createRecordingSnapshot())
  }

  /** 更新录音快照并同步页面 Store。 */
  private update(snapshot: RecordingSnapshot) {
    this.state = snapshot
    this.onChange?.(snapshot)
  }
}

/** 将微信录音管理器和回听播放器适配为可测试端口。 */
export function createUniRecordingPort(): RecordingPort {
  const recorder = uni.getRecorderManager()
  const playback = uni.createInnerAudioContext()
  let stopResolver: ((path: string) => void) | undefined

  recorder.onStop((result) => {
    stopResolver?.(result.tempFilePath)
    stopResolver = undefined
  })

  return {
    deleteFile: (path) =>
      new Promise((resolve) => {
        uni.getFileSystemManager().unlink({
          fail: () => resolve(),
          filePath: path,
          success: () => resolve()
        })
      }),
    playback: (path) => {
      playback.src = path
      playback.play()
      return Promise.resolve()
    },
    requestPermission: () =>
      new Promise((resolve) => {
        uni.authorize({
          fail: () => resolve(false),
          scope: 'scope.record',
          success: () => resolve(true)
        })
      }),
    start: () => {
      recorder.start({ duration: 60_000, format: 'aac' })
      return Promise.resolve()
    },
    stop: () =>
      new Promise((resolve) => {
        stopResolver = resolve
        recorder.stop()
      }),
    stopPlayback: () => playback.stop()
  }
}
