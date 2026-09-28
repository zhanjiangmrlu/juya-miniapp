import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { AudioController, type AudioEngine } from '@/features/audio/audio-controller'
import { type AudioSnapshot, getAudioTargetKey } from '@/features/audio/audio-machine'

import type { SceneService } from '@/features/scene/scene-service'
import type { AudioTarget } from '@/shared/contracts/learning'

export const useAudioStore = defineStore('audio', () => {
  const snapshot = ref<AudioSnapshot>({ status: 'IDLE', target: null })
  let controller: AudioController | undefined

  const currentKey = computed(() =>
    snapshot.value.target ? getAudioTargetKey(snapshot.value.target) : null
  )

  /** 创建 uni-app 音频引擎适配器，并将底层错误交回统一控制器。 */
  function createEngine(): AudioEngine {
    const context = uni.createInnerAudioContext()

    context.onError((error) => {
      const status = error.errMsg.includes('403') ? 403 : error.errCode
      void controller?.handleError(status)
    })

    return {
      destroy: () => context.destroy(),
      pause: () => context.pause(),
      play: () => context.play(),
      setSource: (url) => {
        context.src = url
      },
      stop: () => context.stop()
    }
  }

  /** 按需初始化控制器，整个应用生命周期只维护一个播放器实例。 */
  function ensureController(service: SceneService): AudioController {
    controller ??= new AudioController({
      engine: createEngine(),
      onChange: (next) => {
        snapshot.value = next
      },
      resolveUrl: async (target) => (await service.getSignedUrl(target)).url
    })
    return controller
  }

  /** 播放或切换指定音频目标。 */
  async function play(target: AudioTarget, service: SceneService) {
    await ensureController(service).play(target)
  }

  /** 页面隐藏时销毁播放器，下一次播放重新创建。 */
  function dispose() {
    controller?.dispose()
    controller = undefined
    snapshot.value = { status: 'IDLE', target: null }
  }

  return { currentKey, dispose, play, snapshot }
})
