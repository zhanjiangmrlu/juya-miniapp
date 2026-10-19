import { FULL_AUDIO_LIFETIME_MS } from '@/shared/constants/media'

import type {
  AudioPreparationCancellation,
  FullAudioPreparationEntry,
  FullAudioPreparationPorts
} from '@/shared/types/audio'

import { ApiError } from './errors'

/** 单独准备当前场景的完整音频，提前点击时共享地址并跳过整文件等待
 * @param ports 同一会话、卡片版本和音频引用的受控资源端口
 */
export const createFullAudioPreparation = (ports: FullAudioPreparationPorts) => {
  let alive = true,
    current: FullAudioPreparationEntry | null = null
  /** 清除当前准备结果，原生播放失败后允许重新签发地址 */
  const invalidate = () => {
    const entry = current
    current = null
    if (!entry) return
    clearTimeout(entry.timer)
    entry.stopDownload()
    entry.cancelAddress()
    entry.file?.release()
  }
  /** 页面释放或身份失效后取消请求结果和下载，删除自有文件 */
  const dispose = () => {
    if (!alive) return
    alive = false
    invalidate()
  }
  /** 确认页面仍属于原会话和发布版本 */
  const active = () => {
    if (alive && !ports.active()) dispose()
    return alive
  }
  /** 迟到响应不能进入新页面或已经过期的缓存
   * @param entry 该响应开始时绑定的准备任务
   */
  const valid = (entry: FullAudioPreparationEntry) =>
    active() && current === entry && entry.expires > Date.now()
  /** 获取或创建一个新签发地址，其有效期不因下载完成而延长 */
  const ensure = () => {
    if (!active()) throw new Error('音频准备已取消')
    if (current && (current.expires <= Date.now() || current.failed)) invalidate()
    if (current) return current
    const callbacks = new Set<() => void>()
    let rejectAddress!: (reason: Error) => void
    const cancelled = new Promise<never>((_resolve, reject) => {
      rejectAddress = reject
    })
    const entry: FullAudioPreparationEntry = {
      expires: Date.now() + FULL_AUDIO_LIFETIME_MS,
      url: '',
      file: null,
      address: Promise.resolve(''),
      streaming: false,
      failed: false,
      stopDownload: () => {
        entry.streaming = true
        for (const callback of callbacks) callback()
        callbacks.clear()
      },
      cancelAddress: () => rejectAddress(new Error('音频准备已取消')),
      timer: setTimeout(() => {
        if (current === entry) invalidate()
      }, FULL_AUDIO_LIFETIME_MS)
    }
    current = entry
    const request = Promise.resolve().then(() => {
      if (!valid(entry)) throw new Error('音频准备已取消')
      return ports.resolve()
    })
    entry.address = Promise.race([request, cancelled])
      .then((url) => {
        if (!valid(entry)) throw new Error('音频准备已取消')
        entry.url = url
        return url
      })
      .catch((reason: unknown) => {
        if (valid(entry)) {
          entry.failed = true
          ports.onFailure(reason)
        }
        throw reason
      })
    const task: AudioPreparationCancellation = {
      active: () => valid(entry) && !entry.streaming,
      onCancel: (callback) => {
        if (!task.active()) callback()
        else callbacks.add(callback)
        return () => callbacks.delete(callback)
      }
    }
    // 下载只跟随本次后台准备；点击转为流式后，不再替换播放器的音源
    const prepare = async () => {
      const url = await entry.address
      if (!task.active()) return
      try {
        const file = await ports.download(url, task)
        if (!task.active()) {
          file.release()
          return
        }
        entry.file = file
        callbacks.clear()
        ports.prepared(file.src)
      } catch (reason) {
        if (!task.active()) return
        if (reason instanceof ApiError && [401, 409, 410].includes(reason.status || 0)) {
          entry.failed = true
          ports.onFailure(reason)
        }
      }
    }
    // 后台准备不向页面泄露拒绝；显式点击仍通过 address 取得可重试错误
    void prepare().catch(() => undefined)
    return entry
  }
  /** 页面进入时只准备当前卡片，重复调用不会创建额外下载 */
  const prefetch = () => {
    try {
      ensure()
    } catch {
      /* 页面已经离开 */
    }
  }
  /** 缓存命中时同步返回本地文件，否则取消下载并立即交给网络播放器 */
  const load = (): string | Promise<string> => {
    try {
      const entry = ensure()
      if (entry.file) return entry.file.src
      entry.stopDownload()
      return entry.url || entry.address
    } catch (reason) {
      return Promise.reject(reason)
    }
  }
  return { prefetch, load, invalidate, dispose }
}
