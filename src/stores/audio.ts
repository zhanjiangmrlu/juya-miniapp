import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

import { AudioController } from '@/features/audio/audio-controller'
import { getAudioTargetKey, isSameAudioTarget } from '@/features/audio/audio-machine'
import {
  canPronounceTarget,
  getPronunciationAudioTarget,
  resolvePronunciation
} from '@/features/audio/pronunciation-controller'
import { createPronunciationService } from '@/features/audio/pronunciation-service'
import { createUniAudioEngine } from '@/features/audio/uni-audio-engine'
import { getAnalytics } from '@/services/analytics/runtime'
import { getRuntimeServices } from '@/services/runtime'
import { AnalyticsEvent } from '@/shared/enums/analytics'
import { AudioStatus, AudioTargetType, PronunciationStatus } from '@/shared/enums/audio'
import { useSceneStore } from '@/stores/scene'
import { useSessionStore } from '@/stores/session'

import type { PronunciationContext, PronunciationTarget } from '@/shared/contracts/audio'
import type { AudioTarget } from '@/shared/contracts/learning'
import type { AudioSnapshot, PronunciationService } from '@/shared/types/audio'
import type { SceneService } from '@/shared/types/scene'

export const useAudioStore = defineStore('audio', () => {
  const snapshot = ref<AudioSnapshot>({ status: AudioStatus.IDLE, target: null })
  let controller: AudioController | undefined
  let playSequence = 0
  let reportedSequence = -1
  let playbackToken: number | undefined
  let playbackOwner: symbol | undefined

  const currentKey = computed(() =>
    snapshot.value.target ? getAudioTargetKey(snapshot.value.target) : null
  )

  /** 按需创建唯一播放器，取址服务由每次播放意图单独传入 */
  const ensureController = (): AudioController => {
    controller ??= new AudioController({
      engine: createUniAudioEngine(),
      onAccessDenied: (target) => {
        const contentType = target.context?.content_type
        const sceneTarget =
          [AudioTargetType.SCENE, AudioTargetType.SENTENCE, 'SCENE', 'SENTENCE'].includes(
            target.target_type as never
          ) ||
          contentType === 'dialogue' ||
          contentType === 'word_card'
        if (target.purpose !== 'FAVORITE_REVIEW' && sceneTarget) useSceneStore().clear()
      },
      onChange: (next) => {
        snapshot.value =
          next.target?.target_type === 'pronunciation' &&
          snapshot.value.target &&
          isSameAudioTarget(snapshot.value.target, next.target)
            ? {
                ...next,
                pronunciationStatus: snapshot.value.pronunciationStatus,
                canRetry: snapshot.value.canRetry
              }
            : next
        if (
          next.status === AudioStatus.PLAYING &&
          next.target &&
          reportedSequence !== playSequence
        ) {
          reportedSequence = playSequence
          getAnalytics().track(
            AnalyticsEvent.AUDIO_PLAY_START,
            {
              content_scene_id: next.target.scene_id,
              content_revision_id: next.target.revision_id,
              entry_type: next.target.target_type
            },
            { token: playbackToken }
          )
        }
      },
      resolveUrl: async () => {
        throw new Error('缺少当前播放签名服务')
      }
    })
    return controller
  }

  /** 播放目标，target 为资源区间，service 为签名服务，owner 为可选页面所有者 */
  const play = async (
    target: AudioTarget,
    service: Pick<SceneService, 'getSignedUrl'>,
    owner?: symbol
  ) => {
    if (playbackOwner !== owner) controller?.stop()
    playbackOwner = owner
    const current = controller?.snapshot
    if (
      !current ||
      !isSameAudioTarget(current.target, target) ||
      ![AudioStatus.PLAYING, AudioStatus.LOADING].includes(current.status as never)
    ) {
      playbackToken = getAnalytics().capture()
      playSequence++
    }
    await ensureController().play(target, async (next) => (await service.getSignedUrl(next)).url)
  }

  /** 播放确认发音，target 为读音目标，context 为授权引用，service 为解析端口，owner 为当前页面所有者 */
  const playPronunciation = async (
    target: PronunciationTarget,
    context: PronunciationContext,
    service?: PronunciationService,
    owner?: symbol
  ) => {
    if (!canPronounceTarget(target)) return
    const playbackTarget = getPronunciationAudioTarget(target, context)
    const current = controller?.snapshot
    if (
      isSameAudioTarget(current?.target ?? null, playbackTarget) &&
      snapshot.value.canRetry === false &&
      current?.status === AudioStatus.FAILED
    )
      return
    if (playbackOwner !== owner) controller?.stop()
    playbackOwner = owner
    const player = ensureController()
    await player.play(playbackTarget, async (_next, signal) => {
      const result = await resolvePronunciation(
        target,
        context,
        service ?? createPronunciationService(getRuntimeServices().client),
        signal
      )
      if (signal.aborted) throw Object.assign(new Error('请求已取消'), { name: 'AbortError' })
      snapshot.value = {
        ...snapshot.value,
        pronunciationStatus: result.status,
        canRetry: result.can_retry
      }
      if (result.status !== PronunciationStatus.READY || !result.url)
        throw new Error(result.code ?? '发音暂不可用')
      return result.url
    })
  }

  /** 页面隐藏时销毁播放器，下一次播放重新创建 */
  const dispose = () => {
    controller?.dispose()
    controller = undefined
    playbackOwner = undefined
    snapshot.value = { status: AudioStatus.IDLE, target: null }
  }

  /** 仅取消仍属于该页面的请求及播放，owner 为页面身份，key 为可选旧目标键 */
  const cancelOwned = (owner: symbol, key?: string) => {
    if (playbackOwner !== owner || (key && currentKey.value !== key)) return
    dispose()
  }

  /** 停止原音以便开始录音或本地回听 */
  const stop = () => controller?.stop()
  watch(() => useSessionStore().cleanupGeneration, dispose, { flush: 'sync' })

  return { cancelOwned, currentKey, dispose, play, playPronunciation, snapshot, stop }
})
