import { WORD_ADDRESS_LIFETIME_MS } from '@/shared/constants/media'

import type {
  PreparedWordAudio,
  WordAudioCancellation,
  WordAudioFile,
  WordAudioPreparationJob,
  WordAudioPreparationPorts
} from '@/shared/types/pronunciation'

import { ApiError } from './errors'

/** 等待服务端建议的查询间隔，离页或切词时立即取消
 * @param milliseconds 服务端建议的下一次查询间隔
 * @param task 当前准备任务的取消边界
 */
export const waitForWordAudio = (
  milliseconds: number,
  task: WordAudioCancellation
): Promise<void> =>
  new Promise((resolve, reject) => {
    if (!task.active()) {
      reject(new Error('试听已取消'))
      return
    }
    const timer = setTimeout(() => {
      unsubscribe()
      resolve()
    }, milliseconds)
    const unsubscribe = task.onCancel(() => {
      clearTimeout(timer)
      reject(new Error('试听已取消'))
    })
  })

/** 为单个已鉴权场景准备词汇，后台与主动点击分别占用一个通道
 * @param ports 同一会话和卡片版本的发音、下载与失效处理端口
 */
export const createWordAudioPreparation = (ports: WordAudioPreparationPorts) => {
  const ready = new Map<string, PreparedWordAudio>(),
    pending = new Map<string, WordAudioPreparationJob>(),
    queue: string[] = []
  let alive = true,
    backgroundRunning = false,
    foreground: WordAudioPreparationJob | null = null

  /** 释放一个词汇持有的文件及到期任务
   * @param id 当前页面中的词汇编号
   */
  const release = (id: string) => {
    const entry = ready.get(id)
    if (!entry) return
    ready.delete(id)
    clearTimeout(entry.timer)
    entry.file.release()
  }
  /** 离页、会话失效或内容变化时停止后续请求并回收临时文件 */
  const dispose = () => {
    if (!alive) return
    alive = false
    queue.length = 0
    for (const job of pending.values()) job.cancel()
    pending.clear()
    for (const id of ready.keys()) release(id)
    foreground = null
  }
  /** 不允许旧会话或旧发布版本继续读取本地缓存 */
  const active = () => {
    if (alive && !ports.active()) dispose()
    return alive
  }
  /** 同步取得仍在受控有效期内的音源
   * @param id 当前页面中的词汇编号
   */
  const peek = (id: string): string | null => {
    if (!active()) return null
    const entry = ready.get(id)
    if (!entry) return null
    if (entry.expires <= Date.now()) {
      release(id)
      return null
    }
    return entry.file.src
  }
  /** 原生播放失败后丢弃该词汇，允许下一次点击重新准备
   * @param id 播放失败的词汇编号
   */
  const invalidate = (id: string) => {
    release(id)
    const job = pending.get(id)
    if (job) {
      job.cancel()
      pending.delete(id)
      if (foreground === job) foreground = null
    }
  }
  /** 同一个词汇只启动一次合成与下载，不延长服务端签发时间
   * @param id 当前页面中的词汇编号
   */
  const start = (id: string) => {
    const callbacks = new Set<() => void>()
    let cancelled = false,
      rejectCancellation!: (reason: Error) => void
    const task: WordAudioCancellation = {
      active: () => !cancelled && active(),
      onCancel: (callback) => {
        if (!task.active()) callback()
        else callbacks.add(callback)
        return () => callbacks.delete(callback)
      }
    }
    const cancellation = new Promise<never>((_resolve, reject) => {
      rejectCancellation = reject
    })
    const job: WordAudioPreparationJob = {
      promise: Promise.resolve(''),
      cancel: () => {
        if (cancelled) return
        cancelled = true
        if (pending.get(id) === job) pending.delete(id)
        if (foreground === job) foreground = null
        rejectCancellation(new Error('试听已取消'))
        for (const callback of callbacks) callback()
        callbacks.clear()
      }
    }
    pending.set(id, job)
    const work = async () => {
      const expires = Date.now() + WORD_ADDRESS_LIFETIME_MS
      const url = await ports.resolve(id, task)
      if (!task.active()) throw new Error('试听已取消')
      let file: WordAudioFile
      try {
        file = await ports.download(url, task)
      } catch (reason) {
        if (!task.active()) throw new Error('试听已取消')
        if (reason instanceof ApiError && [401, 409, 410].includes(reason.status || 0)) throw reason
        file = { src: url, release: () => undefined }
      }
      if (!task.active() || expires <= Date.now()) {
        file.release()
        throw new Error('试听已取消')
      }
      release(id)
      ready.set(id, {
        file,
        expires,
        timer: setTimeout(() => release(id), expires - Date.now())
      })
      return file.src
    }
    job.promise = Promise.race([work(), cancellation])
      .catch((reason: unknown) => {
        if (task.active()) ports.onFailure(reason)
        throw reason
      })
      .finally(() => {
        callbacks.clear()
        if (pending.get(id) === job) pending.delete(id)
        if (foreground === job) foreground = null
      })
    return job
  }
  /** 点击直接复用已准备或进行中的词汇，不排在其他后台词汇后面
   * @param id 用户当前选择的词汇编号
   */
  const load = (id: string): string | Promise<string> => {
    if (!active()) return Promise.reject(new Error('试听已取消'))
    const existing = pending.get(id)
    if (foreground && foreground !== existing) foreground.cancel()
    const cached = peek(id)
    if (cached) return cached
    if (existing) return existing.promise
    foreground = start(id)
    return foreground.promise
  }
  /** 串行准备当前卡片词汇，后台失败不打断正文或阻止下个词汇 */
  const pump = async () => {
    if (backgroundRunning) return
    backgroundRunning = true
    try {
      while (queue.length && active()) {
        const id = queue.shift()!
        if (peek(id)) continue
        await (pending.get(id) || start(id)).promise.catch(() => undefined)
      }
    } finally {
      backgroundRunning = false
    }
  }
  /** 按正文顺序预加载，后台从不创建或启动播放器
   * @param ids 当前发布版本中的词汇编号列表
   */
  const prefetch = (ids: string[]) => {
    if (!active()) return
    for (const id of ids) if (!queue.includes(id) && !peek(id)) queue.push(id)
    void pump()
  }
  return { peek, load, prefetch, invalidate, dispose }
}
