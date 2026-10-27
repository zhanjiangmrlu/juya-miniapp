import { WORD_ADDRESS_LIFETIME_MS, WORD_AUDIO_CLICK_WAIT_MS } from '@/shared/constants/media'

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
   * @param background 是否为唯一后台通道中的原始任务
   */
  const start = (id: string, background = false) => {
    const callbacks = new Set<() => void>()
    let cancelled = false,
      selected = false,
      downloadActive = true,
      url = '',
      clickTimer: ReturnType<typeof setTimeout> | undefined,
      stream!: (file: WordAudioFile) => void,
      rejectCancellation!: (reason: Error) => void
    const downloadCallbacks = new Set<() => void>()
    const streaming = new Promise<WordAudioFile>((resolve) => {
      stream = resolve
    })
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
    /** 点击只等待当前下载短暂完成，随后使用同一有效地址而不重复取址 */
    const promote = () => {
      selected = true
      if (!url || clickTimer || !task.active()) return
      clickTimer = setTimeout(() => {
        if (!task.active()) return
        downloadActive = false
        // 先完成回退，再取消下载，避免同步 abort 回调覆盖当前选择
        stream({ src: url, release: () => undefined })
        for (const callback of downloadCallbacks) callback()
        downloadCallbacks.clear()
      }, WORD_AUDIO_CLICK_WAIT_MS)
    }
    const downloadTask: WordAudioCancellation = {
      active: () => downloadActive && task.active(),
      onCancel: (callback) => {
        if (!downloadTask.active()) callback()
        else downloadCallbacks.add(callback)
        return () => downloadCallbacks.delete(callback)
      }
    }
    const job: WordAudioPreparationJob = {
      background,
      promise: Promise.resolve(''),
      promote,
      demote: () => {
        selected = false
        clearTimeout(clickTimer)
        clickTimer = undefined
      },
      cancel: () => {
        if (cancelled) return
        cancelled = true
        if (pending.get(id) === job) pending.delete(id)
        if (foreground === job) foreground = null
        rejectCancellation(new Error('试听已取消'))
        clearTimeout(clickTimer)
        for (const callback of downloadCallbacks) callback()
        downloadCallbacks.clear()
        for (const callback of callbacks) callback()
        callbacks.clear()
      }
    }
    pending.set(id, job)
    const work = async () => {
      const expires = Date.now() + WORD_ADDRESS_LIFETIME_MS
      url = await ports.resolve(id, task)
      if (!task.active()) throw new Error('试听已取消')
      if (selected) promote()
      let file: WordAudioFile
      try {
        const downloading = ports.download(url, downloadTask).then((value) => {
          if (!downloadTask.active()) {
            value.release()
            throw new Error('试听已取消')
          }
          return value
        })
        file = await Promise.race([downloading, streaming])
      } catch (reason) {
        if (!task.active()) throw new Error('试听已取消')
        if (
          reason instanceof ApiError &&
          ((reason.status >= 400 && reason.status < 500) ||
            reason.code === 'word_audio_format_invalid')
        )
          throw reason
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
        clearTimeout(clickTimer)
        callbacks.clear()
        downloadCallbacks.clear()
        if (pending.get(id) === job) pending.delete(id)
        if (foreground === job) foreground = null
      })
    return job
  }
  /** 释放当前点击占用的前台通道，原有后台预取可继续且保留已就绪缓存 */
  const cancelSelection = () => {
    const selection = foreground
    foreground = null
    if (selection?.background) selection.demote()
    else selection?.cancel()
  }
  /** 点击直接复用已准备或进行中的词汇，不排在其他后台词汇后面
   * @param id 用户当前选择的词汇编号
   */
  const load = (id: string): string | Promise<string> => {
    if (!active()) return Promise.reject(new Error('试听已取消'))
    const existing = pending.get(id)
    if (foreground && foreground !== existing && !foreground.background) foreground.cancel()
    const cached = peek(id)
    if (cached) return cached
    if (existing) {
      foreground = existing
      existing.promote()
      return existing.promise
    }
    foreground = start(id)
    foreground.promote()
    return foreground.promise
  }
  /** 串行准备当前卡片词汇，后台失败不打断正文或阻止下个词汇 */
  const pump = async () => {
    if (backgroundRunning) return
    backgroundRunning = true
    try {
      while (queue.length && active()) {
        if (foreground) {
          await foreground.promise.catch(() => undefined)
          continue
        }
        const id = queue.shift()!
        if (peek(id)) continue
        await (pending.get(id) || start(id, true)).promise.catch(() => undefined)
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
  return { peek, load, prefetch, invalidate, cancelSelection, dispose }
}
