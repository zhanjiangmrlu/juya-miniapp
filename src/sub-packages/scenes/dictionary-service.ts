import { session } from '@/services/api'
import { ApiError } from '@/services/errors'
import { operationKey, resourceURL } from '@/services/platform'
import { loadPronunciation } from '@/services/pronunciation-service'
import { prepareWordAudioFile } from '@/services/word-audio-file'
import { DICTIONARY_PREFETCH_CONCURRENCY } from '@/shared/constants/dictionary'
import { PRONUNCIATION_MAX_CHECKS } from '@/shared/constants/media'
import { dictionaryQuery, dictionarySpeechKey } from '@/sub-packages/scenes/dictionary-model'
import {
  createWordAudioPreparation,
  waitForWordAudio
} from '@/sub-packages/scenes/word-audio-preparation'

import type {
  DictionarySelection,
  DictionarySpeechCache,
  DictionarySpeechPreparation
} from '@/shared/types/dictionary'
import type { PronunciationState } from '@/shared/types/pronunciation'

/** 将同形异音保留为不同正文目标，只合并完全一致的受控引用
 * @param selection 当前发布版本的原词及精确位置
 */
const referenceKey = (selection: DictionarySelection) =>
  `${dictionarySpeechKey(selection)}:${selection.word}`

/** 为同一页面保存精确正文引用、短期音频缓存与两个只读后台通道
 * @param active 本人账号、发布版本及学习权限仍有效的检查
 * @param onFailure 将服务端确认的访问失效交回详情处理
 */
export const createDictionarySpeechCache = (
  active: () => boolean,
  onFailure: (reason: unknown) => void
): DictionarySpeechCache => {
  const references = new Map<string, DictionarySelection>(),
    addresses = new Map<string, string>(),
    queued = new Set<string>(),
    running = new Set<string>(),
    visited = new Set<string>(),
    timers = new Map<string, ReturnType<typeof setTimeout>>(),
    checks = new Map<string, number>()
  let alive = true,
    selected = ''
  /** 释放页面持有的音频和后台轮询，迟到请求不能恢复旧页面 */
  const dispose = () => {
    if (!alive) return
    alive = false
    for (const timer of timers.values()) clearTimeout(timer)
    timers.clear()
    queued.clear()
    addresses.clear()
    references.clear()
    prepared.dispose()
  }
  /** 每次异步边界重新核对账号、版本和授权 */
  const current = () => {
    if (alive && !active()) dispose()
    return alive
  }
  /** 请求同一受控正文引用，不向服务端传入词典原形或自由读音
   * @param key 当前页面中的精确引用键
   * @param method 后台只查询，前台允许创建或提升生成任务
   */
  const request = (key: string, method: 'GET' | 'POST') => {
    const selection = references.get(key)!,
      path = `/api/mini/v1/cards/${encodeURIComponent(selection.cardId)}/dictionary/pronunciation`,
      { cardId: _cardId, ...reference } = selection
    return session.request<PronunciationState>(
      method === 'GET' ? `${path}?${dictionaryQuery(reference)}` : path,
      method === 'POST' ? { method, key: operationKey(), body: reference } : {}
    )
  }
  const prepared = createWordAudioPreparation({
    active: current,
    resolve: async (key, task) => {
      const cached = addresses.get(key)
      if (cached) return cached
      const value = await request(key, 'GET')
      if (!task.active()) throw new Error('试听已取消')
      if (value.state === 'ready' && value.url) return resourceURL(value.url)
      if (value.state !== 'missing' && value.state !== 'processing' && value.state !== 'failed')
        throw new ApiError(
          value.error_code || 'pronunciation_unavailable',
          '发音暂不可用，点击重试'
        )
      // 主动选词走既有POST通道，后端可将排队预热提升为普通任务
      return resourceURL(
        await loadPronunciation(
          {
            active: task.active,
            pause: (milliseconds) => waitForWordAudio(milliseconds, task),
            request: (method) => request(key, method)
          },
          '',
          { version_id: references.get(key)!.version_id }
        )
      )
    },
    download: prepareWordAudioFile,
    onFailure
  })
  /** 只读后台查询完成后立即让出槽位，processing延时重新排队
   * @param key 正在检查的精确正文引用
   */
  const inspect = async (key: string) => {
    const started = Date.now()
    try {
      const value = await request(key, 'GET')
      if (!current()) return
      if (value.state === 'ready' && value.url) {
        addresses.set(key, resourceURL(value.url))
        try {
          // 下载失败已由共用准备器报告，后台不能重复触发权限恢复
          await Promise.resolve(prepared.warm(key, started)).catch(() => undefined)
        } finally {
          addresses.delete(key)
        }
      } else if (value.state === 'processing') {
        const count = (checks.get(key) || 0) + 1
        checks.set(key, count)
        if (count >= PRONUNCIATION_MAX_CHECKS) return
        timers.set(
          key,
          setTimeout(
            () => {
              timers.delete(key)
              if (!current() || prepared.peek(key)) return
              queued.add(key)
              pump()
            },
            Math.max(0.25, Math.min(value.retry_after ?? 1, 5)) * 1000
          )
        )
      }
    } catch (reason) {
      if (current()) onFailure(reason)
    } finally {
      running.delete(key)
      pump()
    }
  }
  /** 始终给正文后台保留两个槽，用户前台不排在后台队列后面 */
  const pump = () => {
    while (current() && running.size < DICTIONARY_PREFETCH_CONCURRENCY && queued.size) {
      const key = queued.values().next().value!
      queued.delete(key)
      if (prepared.peek(key)) continue
      running.add(key)
      void inspect(key)
    }
  }
  /** 可见正文优先，其余引用保持原文顺序；重复刷新布局不重查missing目标
   * @param selections 当前页面所有完整正文词元的精确引用
   * @param visible 当前视口内的正文引用，保持可见段落顺序
   */
  const prefetch = (selections: DictionarySelection[], visible: DictionarySelection[] = []) => {
    if (!current()) return
    for (const selection of selections) {
      const key = referenceKey(selection)
      references.set(key, selection)
      if (!visited.has(key)) {
        visited.add(key)
        queued.add(key)
      }
    }
    const priority = visible.map(referenceKey).filter((key) => queued.has(key)),
      rest = [...queued].filter((key) => !priority.includes(key))
    queued.clear()
    for (const key of [...priority, ...rest]) queued.add(key)
    pump()
  }
  /** 创建弹窗轻量句柄，关闭仅取消选择，文件仍属于页面
   * @param selection 本次弹窗的完整正文词元引用
   */
  const prepare = (selection: DictionarySelection): DictionarySpeechPreparation => {
    const key = referenceKey(selection)
    references.set(key, selection)
    return {
      load: () => {
        selected = key
        return prepared.load(key)
      },
      dispose,
      invalidate: () => prepared.invalidate(key),
      cancelSelection: () => {
        if (selected !== key) return
        selected = ''
        prepared.cancelSelection()
      }
    }
  }
  return { prepare, prefetch, dispose }
}

/** 兼容独立引用调用，页面使用共享缓存来跨弹窗复用
 * @param selection 当前本人版本内的原词与精确位置
 * @param active 当前页面与访问授权仍有效的检查
 * @param onFailure 将访问失效交回当前详情处理
 */
export const createDictionarySpeech = (
  selection: DictionarySelection,
  active: () => boolean,
  onFailure: (reason: unknown) => void
): DictionarySpeechPreparation => createDictionarySpeechCache(active, onFailure).prepare(selection)
