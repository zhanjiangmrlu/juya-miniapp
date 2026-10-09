import { describe, expect, it, vi } from 'vitest'

import { AudioController, type AudioEngine } from '@/features/audio/audio-controller'

import type { AudioTarget } from '@/shared/contracts/learning'

const first: AudioTarget = { target_id: 'one', target_type: 'sentence', version_id: 'v1' }
const second: AudioTarget = { target_id: 'two', target_type: 'sentence', version_id: 'v1' }

/** 创建可观测的音频引擎替身，用于验证资源切换和释放。 */
const createEngine = (): AudioEngine => {
  let listener: Parameters<AudioEngine['subscribe']>[0] | undefined
  return {
    destroy: vi.fn(),
    pause: vi.fn(() => listener?.({ type: 'pause' })),
    play: vi.fn(() => listener?.({ type: 'play' })),
    seek: vi.fn(),
    setSource: vi.fn(() => listener?.({ type: 'canplay' })),
    subscribe: (next) => {
      listener = next
      return () => {
        listener = undefined
      }
    },
    stop: vi.fn()
  }
}

describe('AudioController', () => {
  it('同一目标在播放与暂停间切换，新目标先停止旧目标', async () => {
    const engine = createEngine()
    const controller = new AudioController({
      engine,
      resolveUrl: vi.fn(async (target) => `https://audio.test/${target.target_id}`)
    })

    await controller.play(first)
    await controller.play(first)
    await controller.play(first)
    await controller.play(second)

    expect(engine.pause).toHaveBeenCalledTimes(1)
    expect(engine.stop).toHaveBeenCalledTimes(1)
    expect(engine.play).toHaveBeenCalledTimes(3)
    expect(engine.setSource).toHaveBeenLastCalledWith('https://audio.test/two')
  })

  it('403 仅为当前目标重新获取一次签名地址', async () => {
    const engine = createEngine()
    const resolveUrl = vi.fn(async () => 'https://audio.test/signed')
    const controller = new AudioController({ engine, resolveUrl })

    await controller.play(first)
    await controller.handleError(403)
    await controller.handleError(403)

    expect(resolveUrl).toHaveBeenCalledTimes(2)
    expect(controller.snapshot.status).toBe('FAILED')
  })

  it('页面隐藏时释放唯一播放器和目标状态', async () => {
    const engine = createEngine()
    const controller = new AudioController({
      engine,
      resolveUrl: vi.fn(async () => 'https://audio.test/one')
    })

    await controller.play(first)
    controller.dispose()

    expect(engine.stop).toHaveBeenCalledOnce()
    expect(engine.destroy).toHaveBeenCalledOnce()
    expect(controller.snapshot).toMatchObject({ status: 'IDLE', target: null })
  })
})
