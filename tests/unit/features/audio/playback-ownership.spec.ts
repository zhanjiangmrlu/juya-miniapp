import { describe, expect, it, vi } from 'vitest'

import { AudioController } from '@/features/audio/audio-controller'
import { RecordingController } from '@/features/recording/recording-controller'

const target = { target_id: 'full', target_type: 'scene', version_id: 'v1' }
describe('全局播放所有权', () => {
  it('另一设备播放会停止原设备并取消等待中的签名', async () => {
    let done!: (url: string) => void
    const makeEngine = () => ({
      stop: vi.fn(),
      destroy: vi.fn(),
      setSource: vi.fn(),
      pause: vi.fn(),
      play: vi.fn(),
      seek: vi.fn(),
      subscribe: () => () => undefined
    })
    const firstEngine = makeEngine()
    const first = new AudioController({
      engine: firstEngine,
      resolveUrl: () =>
        new Promise((resolve) => {
          done = resolve
        })
    })
    const second = new AudioController({ engine: makeEngine(), resolveUrl: async () => 'second' })
    const pending = first.play(target)
    await second.play({ ...target, target_id: 'second' })
    done('late')
    await pending
    expect(first.snapshot.target).toBeNull()
    expect(firstEngine.setSource).not.toHaveBeenCalled()
    first.dispose()
    second.dispose()
  })
  it('录音开始停原音，之后原音开始停止本地回听', async () => {
    const engine = {
      stop: vi.fn(),
      destroy: vi.fn(),
      setSource: vi.fn(),
      pause: vi.fn(),
      play: vi.fn(),
      seek: vi.fn(),
      subscribe: () => () => undefined
    }
    const original = new AudioController({ engine, resolveUrl: async () => 'signed' })
    const port = {
      requestPermission: async () => true,
      start: async () => undefined,
      stop: async () => 'local',
      deleteFile: async () => undefined,
      playback: async () => undefined,
      stopPlayback: vi.fn()
    }
    const recording = new RecordingController(port)
    await original.play(target)
    await recording.selectSentence('s1')
    await recording.start()
    expect(original.snapshot.target).toBeNull()
    await recording.stop()
    await recording.playback()
    port.stopPlayback.mockClear()
    await original.play(target)
    expect(port.stopPlayback).toHaveBeenCalled()
    original.dispose()
    await recording.dispose()
  })
})
