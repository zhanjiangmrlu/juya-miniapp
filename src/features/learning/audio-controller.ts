import { AudioStatus } from '@/shared/enums/audio'

import type { AudioPort, AudioState } from '@/shared/types/audio'

/** 用两条底层音轨实现完整音频与词汇的互斥播放
 * @param full 当前场景完整音频播放器
 * @param word 独立词汇播放器
 * @param changed 页面状态更新端口
 */
export const createAudioController = (
  full: AudioPort,
  word: AudioPort,
  changed: (state: AudioState) => void = () => {}
) => {
  const state: AudioState = {
    status: AudioStatus.IDLE,
    position: 0,
    duration: 0,
    error: '',
    wordId: null,
    wordStatus: AudioStatus.IDLE,
    wordError: ''
  }
  let alive = true,
    fullGeneration = 0,
    wordGeneration = 0,
    pendingSeek = 0
  /** 输出当前可信音频状态 */
  const notify = () => {
    if (alive) changed({ ...state })
  }
  full.onPlay(() => {
    if (!alive) return
    state.status = AudioStatus.PLAYING
    if (pendingSeek > 0) {
      full.seek(pendingSeek)
      pendingSeek = 0
    }
    notify()
  })
  full.onPause(() => {
    if (!alive) return
    state.status = AudioStatus.PAUSED
    notify()
  })
  full.onEnded(() => {
    if (!alive) return
    state.status = AudioStatus.ENDED
    state.position = state.duration
    notify()
  })
  full.onTimeUpdate(() => {
    if (!alive) return
    state.position = Number.isFinite(full.currentTime) ? full.currentTime : 0
    state.duration = Number.isFinite(full.duration) ? full.duration : 0
    notify()
  })
  full.onError(() => {
    if (!alive) return
    state.status = AudioStatus.ERROR
    state.error = '音频暂不可用，点击重试'
    notify()
  })
  word.onPlay(() => {
    if (!alive) return
    state.wordStatus = AudioStatus.PLAYING
    notify()
  })
  word.onEnded(() => {
    if (!alive) return
    state.wordStatus = AudioStatus.IDLE
    notify()
  })
  word.onError(() => {
    if (!alive) return
    state.wordStatus = AudioStatus.ERROR
    state.wordError = '发音暂不可用，点击重试'
    notify()
  })
  /** 主动播放或暂停完整音频，重复加载点击不创建新请求
   * @param load 获取当前受控完整音频地址
   */
  const toggleFull = async (load: () => Promise<string>) => {
    if (!alive || state.status === AudioStatus.LOADING) return
    if (state.status === AudioStatus.PLAYING) {
      full.pause()
      return
    }
    wordGeneration++
    word.stop()
    state.wordStatus = AudioStatus.IDLE
    state.wordId = null
    if (state.status === AudioStatus.PAUSED && full.src) {
      full.play()
      notify()
      return
    }
    const generation = ++fullGeneration
    if (state.status === AudioStatus.ENDED) state.position = 0
    pendingSeek = state.position
    state.status = AudioStatus.LOADING
    state.error = ''
    notify()
    try {
      const url = await load()
      if (!alive || generation !== fullGeneration) return
      full.src = url
      full.play()
    } catch {
      if (alive && generation === fullGeneration) {
        state.status = AudioStatus.ERROR
        state.error = '音频暂不可用，点击重试'
        notify()
      }
    }
  }
  /** 播放受控词汇，立即暂停完整音频并忽略旧词汇的异步响应
   * @param id 当前版本的词汇引用
   * @param load 获取该词汇的受控发音地址
   */
  const playWord = async (id: string, load: () => Promise<string>) => {
    if (!alive) return
    fullGeneration++
    if (state.status === AudioStatus.PLAYING || state.status === AudioStatus.LOADING) {
      full.pause()
      state.status = AudioStatus.PAUSED
    }
    word.stop()
    const generation = ++wordGeneration
    state.wordId = id
    state.wordStatus = AudioStatus.LOADING
    state.wordError = ''
    notify()
    try {
      const url = await load()
      if (!alive || generation !== wordGeneration) return
      word.src = url
      word.seek(0)
      word.play()
    } catch {
      if (alive && generation === wordGeneration) {
        state.wordStatus = AudioStatus.ERROR
        state.wordError = '发音暂不可用，点击重试'
        notify()
      }
    }
  }
  /** 拖动只改变位置，保留播放或暂停状态
   * @param seconds 用户选择的秒数
   */
  const seekFull = (seconds: number) => {
    if (!alive || !Number.isFinite(seconds)) return
    state.position = Math.max(0, Math.min(seconds, state.duration || full.duration || 0))
    full.seek(state.position)
    notify()
  }
  /** 离开场景时销毁音轨并取消所有未返回的资源请求 */
  const dispose = () => {
    if (!alive) return
    alive = false
    fullGeneration++
    wordGeneration++
    full.stop()
    word.stop()
    full.destroy()
    word.destroy()
  }
  return { toggleFull, playWord, seekFull, dispose, state }
}
