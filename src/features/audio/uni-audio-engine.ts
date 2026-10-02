import type { AudioEngine, AudioEvent } from './audio-controller'

/** 将 uni 播放事件适配为独占设备端口，每次切换源都会使旧设备事件失效 */
export const createUniAudioEngine = (): AudioEngine => {
  let context: UniApp.InnerAudioContext | undefined
  let listener: ((event: AudioEvent) => void) | undefined
  let generation = 0

  /** 销毁设备，清除旧监听与排队事件 */
  const release = () => {
    generation++
    context?.stop()
    context?.destroy()
    context = undefined
  }

  return {
    destroy: () => {
      listener = undefined
      release()
    },
    pause: () => context?.pause(),
    play: () => context?.play(),
    /** 定位到音频秒数，seconds 为当前句起点或暂停位置 */
    seek: (seconds) => context?.seek(seconds),
    stop: release,
    /** 订阅设备事件，next 为当前资源状态回调 */
    subscribe: (next) => {
      listener = next
      return () => {
        if (listener === next) listener = undefined
      }
    },
    /** 切换授权资源，url 为已签名的当前发布媒体地址 */
    setSource: (url) => {
      release()
      const active = generation
      const device = uni.createInnerAudioContext()
      context = device
      /** 转发当前设备事件，event 为真实底层事件 */
      const emit = (event: AudioEvent) => {
        if (active === generation) listener?.(event)
      }
      device.onCanplay(() => emit({ type: 'canplay' }))
      device.onPlay(() => emit({ type: 'play' }))
      device.onPause(() => emit({ type: 'pause' }))
      device.onEnded(() => emit({ type: 'ended' }))
      device.onTimeUpdate(() =>
        emit({ type: 'timeupdate', currentTimeMs: Math.round(device.currentTime * 1000) })
      )
      device.onError((error) =>
        emit({ type: 'error', status: error.errMsg.includes('403') ? 403 : error.errCode })
      )
      device.autoplay = false
      device.src = url
    }
  }
}
