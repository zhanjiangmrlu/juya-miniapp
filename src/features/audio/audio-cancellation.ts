import type { AudioCancellation } from '@/shared/types/audio'

/** 创建微信与H5共享的取消信号，不依赖微信未保证的浏览器AbortController */
export const createAudioCancellation = (): AudioCancellation => {
  let aborted = false
  const listeners = new Set<() => void>()
  return {
    signal: {
      get aborted() {
        return aborted
      },
      addEventListener: (_event, listener) => {
        listeners.add(listener)
      },
      removeEventListener: (_event, listener) => {
        listeners.delete(listener)
      }
    },
    abort: () => {
      if (aborted) return
      aborted = true
      for (const listener of listeners) listener()
      listeners.clear()
    }
  }
}
