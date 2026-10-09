import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { AudioController } from '@/features/audio/audio-controller'
import { getAudioTargetKey } from '@/features/audio/audio-machine'
import { createUniAudioEngine } from '@/features/audio/uni-audio-engine'
import { AudioStatus } from '@/shared/enums/audio'
import { useSceneStore } from '@/stores/scene'

import type { AudioTarget } from '@/shared/contracts/learning'
import type { AudioSnapshot } from '@/shared/types/audio'
import type { SceneService } from '@/shared/types/scene'

export const useAudioStore = defineStore('audio', () => {
  const snapshot = ref<AudioSnapshot>({ status: AudioStatus.IDLE, target: null })
  let controller: AudioController | undefined

  const currentKey = computed(() =>
    snapshot.value.target ? getAudioTargetKey(snapshot.value.target) : null
  )

  /** 按需创建唯一播放器，service 为当前场景授权签名服务 */
  const ensureController = (service: SceneService): AudioController => {
    controller ??= new AudioController({
      engine: createUniAudioEngine(),
      onAccessDenied: () => useSceneStore().clear(),
      onChange: (next) => {
        snapshot.value = next
      },
      resolveUrl: async (target) => (await service.getSignedUrl(target)).url
    })
    return controller
  }

  /** 播放目标，target 为资源区间，service 为签名服务 */
  const play = async (target: AudioTarget, service: SceneService) => {
    await ensureController(service).play(target)
  }

  /** 页面隐藏时销毁播放器，下一次播放重新创建 */
  const dispose = () => {
    controller?.dispose()
    controller = undefined
    snapshot.value = { status: AudioStatus.IDLE, target: null }
  }

  /** 停止原音以便开始录音或本地回听 */
  const stop = () => controller?.stop()

  return { currentKey, dispose, play, snapshot, stop }
})
