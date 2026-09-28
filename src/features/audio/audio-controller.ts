import { type AudioSnapshot, isSameAudioTarget } from '@/features/audio/audio-machine'

import type { AudioTarget } from '@/shared/contracts/learning'

export interface AudioEngine {
  destroy(): void
  pause(): void
  play(): void
  setSource(url: string): void
  stop(): void
}

export interface AudioControllerOptions {
  engine: AudioEngine
  onChange?: (snapshot: AudioSnapshot) => void
  resolveUrl(target: AudioTarget): Promise<string>
}

/** 管理应用内唯一音频引擎，保证目标切换、签名重取和释放行为一致。 */
export class AudioController {
  private forbiddenRetried = false
  private state: AudioSnapshot = { status: 'IDLE', target: null }

  constructor(private readonly options: AudioControllerOptions) {}

  get snapshot(): AudioSnapshot {
    return this.state
  }

  /** 播放目标；同一目标切换暂停/继续，新目标先停止旧资源。 */
  async play(target: AudioTarget): Promise<void> {
    if (isSameAudioTarget(this.state.target, target)) {
      if (this.state.status === 'PLAYING') {
        this.pause()
        return
      }

      if (this.state.status === 'PAUSED') {
        this.options.engine.play()
        this.update({ status: 'PLAYING', target })
        return
      }
    }

    if (this.state.target) this.options.engine.stop()
    this.forbiddenRetried = false
    this.update({ status: 'LOADING', target })

    try {
      const url = await this.options.resolveUrl(target)
      this.options.engine.setSource(url)
      this.options.engine.play()
      this.update({ status: 'PLAYING', target })
    } catch {
      this.update({ status: 'FAILED', target })
    }
  }

  /** 暂停当前目标并保留可继续播放的状态。 */
  pause(): void {
    if (this.state.status !== 'PLAYING') return
    this.options.engine.pause()
    this.update({ ...this.state, status: 'PAUSED' })
  }

  /** 停止当前资源并清空目标。 */
  stop(): void {
    if (this.state.target) this.options.engine.stop()
    this.forbiddenRetried = false
    this.update({ status: 'IDLE', target: null })
  }

  /** 处理播放器错误；签名 403 只允许为当前目标重新获取一次。 */
  async handleError(status: number): Promise<void> {
    const target = this.state.target
    if (status !== 403 || !target || this.forbiddenRetried) {
      this.update({ status: 'FAILED', target })
      return
    }

    this.forbiddenRetried = true
    this.update({ status: 'LOADING', target })

    try {
      const url = await this.options.resolveUrl(target)
      this.options.engine.setSource(url)
      this.options.engine.play()
      this.update({ status: 'PLAYING', target })
    } catch {
      this.update({ status: 'FAILED', target })
    }
  }

  /** 页面隐藏或会话失效时彻底释放播放器。 */
  dispose(): void {
    if (this.state.target) this.options.engine.stop()
    this.options.engine.destroy()
    this.update({ status: 'IDLE', target: null })
  }

  /** 更新只读快照并通知 Store 同步渲染状态。 */
  private update(snapshot: AudioSnapshot): void {
    this.state = snapshot
    this.options.onChange?.(snapshot)
  }
}
