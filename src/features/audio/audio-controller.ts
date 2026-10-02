import { type AudioSnapshot, isSameAudioTarget } from '@/features/audio/audio-machine'

import type { AudioTarget } from '@/shared/contracts/learning'

export interface AudioEvent {
  type: 'canplay' | 'play' | 'pause' | 'ended' | 'timeupdate' | 'error'
  currentTimeMs?: number
  status?: number
}
export interface AudioEngine {
  destroy(): void
  pause(): void
  play(): void
  seek(seconds: number): void
  setSource(url: string): void
  stop(): void
  subscribe(listener: (event: AudioEvent) => void): () => void
}
export interface AudioControllerOptions {
  engine: AudioEngine
  onChange?: (snapshot: AudioSnapshot) => void
  onAccessDenied?: () => void
  resolveUrl(target: AudioTarget): Promise<string>
}

/** 管理唯一播放器，签名与设备事件均绑定当前请求代次 */
export class AudioController {
  private forbiddenRetried = false
  private generation = 0
  private unsubscribe?: () => void
  private state: AudioSnapshot = { status: 'IDLE', target: null }

  /** options 为音频设备、签名服务和状态回调 */
  constructor(private readonly options: AudioControllerOptions) {}

  get snapshot(): AudioSnapshot {
    return this.state
  }

  /** 播放或暂停目标，target 为固定版本资源和可选句子时间区间 */
  play = async (target: AudioTarget): Promise<void> => {
    if (isSameAudioTarget(this.state.target, target)) {
      if (this.state.status === 'PLAYING') {
        this.pause()
        return
      }
      if (this.state.status === 'PAUSED') {
        this.options.engine.play()
        return
      }
      if (this.state.status === 'LOADING') return
    }
    this.cancel()
    this.forbiddenRetried = false
    this.update({ status: 'LOADING', target, currentTimeMs: target.start_ms ?? 0 })
    await this.resolve(target, this.generation)
  }

  /** 暂停当前资源，继续时沿用设备时间 */
  pause = (): void => {
    if (this.state.status === 'PLAYING') this.options.engine.pause()
  }

  /** 取消请求和监听并停止资源，清空播放目标 */
  stop = (): void => {
    this.cancel()
    this.forbiddenRetried = false
    this.update({ status: 'IDLE', target: null })
  }

  /** 处理设备错误，status 为设备返回的 HTTP 状态或错误码，403 只重签一次 */
  handleError = async (status: number): Promise<void> => {
    const target = this.state.target
    if (!target) return
    this.cancel()
    if (status !== 403 || this.forbiddenRetried) {
      this.update({ ...this.state, status: 'FAILED' })
      return
    }
    this.forbiddenRetried = true
    this.update({ ...this.state, status: 'LOADING' })
    await this.resolve(target, this.generation)
  }

  /** 释放播放器并使所有迟到请求失效 */
  dispose = (): void => {
    this.stop()
    this.options.engine.destroy()
  }

  /** 取消上一代事件与请求 */
  private cancel = (): void => {
    this.generation++
    this.unsubscribe?.()
    this.unsubscribe = undefined
    if (this.state.target) this.options.engine.stop()
  }

  /** 请求签名并监听当前资源，target 为固定资源，generation 为取消校验代次 */
  private resolve = async (target: AudioTarget, generation: number): Promise<void> => {
    try {
      const url = await this.options.resolveUrl(target)
      if (generation !== this.generation) return
      let ready = false
      this.unsubscribe = this.options.engine.subscribe((event) => {
        if (generation !== this.generation) return
        if (event.type === 'canplay' && !ready) {
          ready = true
          this.options.engine.seek((this.state.currentTimeMs ?? target.start_ms ?? 0) / 1000)
          this.options.engine.play()
        } else if (event.type === 'play') this.update({ ...this.state, status: 'PLAYING' })
        else if (event.type === 'pause') this.update({ ...this.state, status: 'PAUSED' })
        else if (event.type === 'ended') this.stop()
        else if (event.type === 'error') void this.handleError(event.status ?? 0)
        else if (event.type === 'timeupdate') {
          const currentTimeMs = event.currentTimeMs ?? 0
          if (target.end_ms !== undefined && currentTimeMs >= target.end_ms) this.stop()
          else this.update({ ...this.state, currentTimeMs })
        }
      })
      this.options.engine.setSource(url)
    } catch (error) {
      if (generation !== this.generation) return
      const status = (error as { status?: number })?.status
      if (status === 401 || status === 403 || status === 404 || status === 409 || status === 410) {
        this.stop()
        this.options.onAccessDenied?.()
      } else this.update({ ...this.state, status: 'FAILED' })
    }
  }

  /** 同步播放快照，snapshot 为设备驱动的当前状态 */
  private update = (snapshot: AudioSnapshot): void => {
    this.state = snapshot
    this.options.onChange?.(snapshot)
  }
}
