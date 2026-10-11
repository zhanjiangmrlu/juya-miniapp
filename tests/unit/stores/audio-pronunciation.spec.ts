import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAudioStore } from '@/stores/audio'

const dependencies = vi.hoisted(() => ({ source: vi.fn(), clearScene: vi.fn() }))
vi.mock('@/stores/scene', () => ({ useSceneStore: () => ({ clear: dependencies.clearScene }) }))
vi.mock('@/features/audio/uni-audio-engine', () => ({
  createUniAudioEngine: () => ({
    setSource: dependencies.source,
    destroy: vi.fn(),
    pause: vi.fn(),
    play: vi.fn(),
    seek: vi.fn(),
    stop: vi.fn(),
    subscribe: () => () => undefined
  })
}))
vi.mock('@/services/analytics/runtime', () => ({
  getAnalytics: () => ({ track: vi.fn(), capture: () => 1 })
}))
beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})
const target = { target_id: 'word', can_prepare: true }
const context = { favorite_id: 'owned-favorite' }
describe('发音与全局音频状态', () => {
  it('短文音频被拒只释放当前播放器，不清理无关场景正文', async () => {
    const audio = useAudioStore()
    await audio.play(
      { target_id: 'reading', version_id: 'v2', target_type: 'short_reading_whole' },
      {
        getSignedUrl: async () => {
          throw { status: 403 }
        }
      }
    )
    expect(audio.snapshot.target).toBeNull()
    expect(dependencies.clearScene).not.toHaveBeenCalled()
    audio.dispose()
  })
  it('当前场景音频被拒会清理该场景正文', async () => {
    const audio = useAudioStore()
    await audio.play(
      { target_id: 'scene', version_id: 'v2', target_type: 'scene' },
      {
        getSignedUrl: async () => {
          throw { status: 403 }
        }
      }
    )
    expect(dependencies.clearScene).toHaveBeenCalledTimes(1)
    audio.dispose()
  })
  it('服务端禁止重试时保留终态，重复英文点击不再次请求', async () => {
    const service = {
      resolve: vi.fn(async () => ({ status: 'FAILED', can_retry: false })),
      task: vi.fn()
    }
    const audio = useAudioStore()
    await audio.playPronunciation(target, context, service as never)
    expect(audio.snapshot).toMatchObject({
      status: 'FAILED',
      pronunciationStatus: 'FAILED',
      canRetry: false
    })
    await audio.playPronunciation(target, context, service as never)
    expect(service.resolve).toHaveBeenCalledTimes(1)
    audio.dispose()
  })
  it('不可用发音不设置设备地址，正文资料不受影响', async () => {
    const audio = useAudioStore()
    await audio.playPronunciation(target, context, {
      resolve: async () => ({ status: 'UNAVAILABLE' }),
      task: vi.fn()
    } as never)
    expect(audio.snapshot.pronunciationStatus).toBe('UNAVAILABLE')
    expect(dependencies.source).not.toHaveBeenCalled()
    audio.dispose()
  })
  it('同一读音不同收藏授权具有独立播放意图', async () => {
    const service = {
      resolve: vi.fn(async () => ({ status: 'READY', resource_version: 'v2', url: 'signed' })),
      task: vi.fn()
    }
    const audio = useAudioStore()
    await audio.playPronunciation(target, context, service as never)
    const first = audio.currentKey
    await audio.playPronunciation(target, { favorite_id: 'other-favorite' }, service as never)
    expect(audio.currentKey).not.toBe(first)
    expect(service.resolve).toHaveBeenCalledTimes(2)
    audio.dispose()
  })
})
