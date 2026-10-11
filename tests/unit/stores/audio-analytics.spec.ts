import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAudioStore } from '@/stores/audio'

import type { AudioEvent } from '@/shared/types/audio'

const dependencies = vi.hoisted(() => ({
  listener: undefined as ((event: AudioEvent) => void) | undefined,
  track: vi.fn(),
  token: 1
}))
vi.mock('@/services/analytics/runtime', () => ({
  getAnalytics: () => ({ capture: () => dependencies.token, track: dependencies.track })
}))
vi.mock('@/features/audio/uni-audio-engine', () => ({
  createUniAudioEngine: () => ({
    setSource: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    stop: vi.fn(),
    destroy: vi.fn(),
    seek: vi.fn(),
    subscribe: (listener: (event: AudioEvent) => void) => {
      dependencies.listener = listener
      return () => {
        dependencies.listener = undefined
      }
    }
  })
}))
const target = {
  target_id: 'audio',
  target_type: 'SCENE',
  version_id: 'version',
  scene_id: 'coffee',
  revision_id: 'revision'
}
const service = { getSignedUrl: async () => ({ url: 'signed-private-url' }) } as never

beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
  dependencies.token = 1
})
describe('真实播放回调统计', () => {
  it('切换场景与短文各自使用本次传入的签名服务', async () => {
    const first = { getSignedUrl: vi.fn(async () => ({ url: 'scene' })) }
    const second = { getSignedUrl: vi.fn(async () => ({ url: 'short-reading' })) }
    const audio = useAudioStore()
    await audio.play(target, first as never)
    await audio.play(
      { ...target, target_id: 'short-reading', target_type: 'short_reading' },
      second as never
    )
    expect(first.getSignedUrl).toHaveBeenCalledTimes(1)
    expect(second.getSignedUrl).toHaveBeenCalledTimes(1)
    audio.dispose()
  })
  it('签名成功和准备事件不计播放，重复播放回调只计一次，用户恢复播放再计一次', async () => {
    const audio = useAudioStore()
    await audio.play(target, service)
    dependencies.listener?.({ type: 'canplay' })
    expect(dependencies.track).not.toHaveBeenCalled()
    dependencies.listener?.({ type: 'play' })
    dependencies.listener?.({ type: 'play' })
    expect(dependencies.track).toHaveBeenCalledTimes(1)
    dependencies.listener?.({ type: 'pause' })
    await audio.play(target, service)
    dependencies.listener?.({ type: 'play' })
    expect(dependencies.track).toHaveBeenCalledTimes(2)
  })
  it('播放开始前授权变更仍携带旧授权代次，迟到回调不被重新授权洗白', async () => {
    const audio = useAudioStore()
    await audio.play(target, service)
    dependencies.token = 2
    dependencies.listener?.({ type: 'play' })
    expect(dependencies.track).toHaveBeenCalledWith(
      'audio_play_start',
      expect.not.objectContaining({ url: expect.anything() }),
      { token: 1 }
    )
  })
})
