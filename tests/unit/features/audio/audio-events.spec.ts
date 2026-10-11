import { describe, expect, it, vi } from 'vitest'

import { AudioController } from '@/features/audio/audio-controller'
import { getAudioTargetKey } from '@/features/audio/audio-machine'

import type { AudioTarget } from '@/shared/contracts/learning'

const target: AudioTarget = {
  target_id: 'audio',
  target_type: 'SCENE',
  version_id: 'v1',
  sentence_id: 's2',
  start_ms: 3000,
  end_ms: 5000
}

/** 创建可手动发送设备事件的端口，auto 表示自动发送准备和播放事件 */
const createEngine = (auto = true) => {
  let listener: (event: { type: string; currentTimeMs?: number; status?: number }) => void = () =>
    undefined
  const emit = (event: { type: string; currentTimeMs?: number; status?: number }) => listener(event)
  const engine = {
    destroy: vi.fn(),
    pause: vi.fn(() => emit({ type: 'pause' })),
    play: vi.fn(() => {
      if (auto) emit({ type: 'play' })
    }),
    seek: vi.fn(),
    setSource: vi.fn(() => {
      if (auto) emit({ type: 'canplay' })
    }),
    stop: vi.fn(),
    subscribe: vi.fn((next: typeof listener) => {
      listener = next
      return () => {
        listener = () => undefined
      }
    })
  }
  return { engine, emit }
}

describe('真实音频事件与区间', () => {
  it('实际单句切片使用本地文件时间，不再按整段边界截时', async () => {
    const { engine, emit } = createEngine(false)
    const controller = new AudioController({
      engine: engine as never,
      resolveUrl: async () => 'sentence-slice'
    })
    await controller.play({ ...target, target_type: 'sentence' })
    emit({ type: 'canplay' })
    expect(engine.seek).toHaveBeenCalledWith(0)
    emit({ type: 'timeupdate', currentTimeMs: 5000 })
    expect(controller.snapshot.target).not.toBeNull()
    emit({ type: 'ended' })
    expect(controller.snapshot.target).toBeNull()
    controller.dispose()
  })
  it('整段与同资源不同句子拥有独立播放键', () => {
    expect(getAudioTargetKey(target)).not.toBe(
      getAudioTargetKey({ ...target, sentence_id: 's3', start_ms: 5000, end_ms: 7000 })
    )
    expect(getAudioTargetKey(target)).not.toBe(
      getAudioTargetKey({
        ...target,
        sentence_id: undefined,
        start_ms: undefined,
        end_ms: undefined
      })
    )
  })

  it('签名成功仍保持加载，只有真实 play 事件才能显示播放中', async () => {
    const { engine, emit } = createEngine(false)
    const controller = new AudioController({
      engine: engine as never,
      resolveUrl: async () => 'signed'
    })
    await controller.play(target)
    expect(controller.snapshot.status).toBe('LOADING')
    emit({ type: 'canplay' })
    expect(engine.seek).toHaveBeenCalledWith(3)
    expect(controller.snapshot.status).toBe('LOADING')
    emit({ type: 'play' })
    expect(controller.snapshot.status).toBe('PLAYING')
    emit({ type: 'timeupdate', currentTimeMs: 5000 })
    expect(engine.stop).toHaveBeenCalledOnce()
    expect(controller.snapshot.status).toBe('IDLE')
  })

  it('停止后迟到的签名请求不会重新播放', async () => {
    let resolve!: (url: string) => void
    const { engine } = createEngine()
    const controller = new AudioController({
      engine: engine as never,
      resolveUrl: () =>
        new Promise((done) => {
          resolve = done
        })
    })
    const pending = controller.play(target)
    controller.stop()
    resolve('late')
    await pending
    expect(engine.setSource).not.toHaveBeenCalled()
    expect(controller.snapshot.target).toBeNull()
  })

  it('切换目标后旧请求和旧事件都不会覆盖新目标', async () => {
    let resolve!: (url: string) => void
    const { engine } = createEngine()
    const controller = new AudioController({
      engine: engine as never,
      resolveUrl: (next) =>
        next.sentence_id === 's2'
          ? new Promise((done) => {
              resolve = done
            })
          : Promise.resolve('new')
    })
    const pending = controller.play(target)
    await controller.play({ ...target, sentence_id: 's3', start_ms: 6000, end_ms: 8000 })
    resolve('old')
    await pending
    expect(engine.setSource).toHaveBeenCalledExactlyOnceWith('new')
    expect(controller.snapshot.target?.sentence_id).toBe('s3')
  })

  it('暂停后继续重验授权并恢复暂停时间点', async () => {
    const { engine, emit } = createEngine()
    const resolveUrl = vi.fn(async () => 'signed')
    const controller = new AudioController({
      engine: engine as never,
      resolveUrl
    })
    await controller.play(target)
    emit({ type: 'timeupdate', currentTimeMs: 4200 })
    await controller.play(target)
    expect(controller.snapshot.status).toBe('PAUSED')
    await controller.play(target)
    expect(resolveUrl).toHaveBeenCalledTimes(2)
    expect(engine.seek).toHaveBeenLastCalledWith(4.2)
    expect(controller.snapshot.status).toBe('PLAYING')
    controller.dispose()
  })

  it('暂停期间失权后继续不会播放旧签名', async () => {
    const { engine } = createEngine()
    const denied = vi.fn()
    const resolveUrl = vi
      .fn()
      .mockResolvedValueOnce('signed')
      .mockRejectedValueOnce({ status: 403 })
    const controller = new AudioController({
      engine: engine as never,
      resolveUrl,
      onAccessDenied: denied
    })
    await controller.play(target)
    await controller.play(target)
    await controller.play(target)
    expect(engine.play).toHaveBeenCalledOnce()
    expect(denied).toHaveBeenCalledWith(target)
    expect(controller.snapshot.target).toBeNull()
    controller.dispose()
  })

  it('设置音频资源失败后旧设备事件不能覆盖失败状态', async () => {
    const { engine } = createEngine(false)
    let late!: (event: { type: string }) => void
    engine.subscribe = vi.fn((listener) => {
      late = listener
      return vi.fn()
    })
    engine.setSource = vi.fn(() => {
      throw new Error('device unavailable')
    })
    const controller = new AudioController({
      engine: engine as never,
      resolveUrl: async () => 'signed'
    })
    await controller.play(target)
    late({ type: 'play' })
    expect(controller.snapshot.status).toBe('FAILED')
    expect(engine.stop).toHaveBeenCalledOnce()
    controller.dispose()
  })

  it('签名接口确认权限失效后释放播放器并通知清空正文', async () => {
    const { engine } = createEngine()
    const denied = vi.fn()
    const controller = new AudioController({
      engine: engine as never,
      onAccessDenied: denied,
      resolveUrl: async () => {
        throw { status: 403, code: 'SCENE_ACCESS_DENIED' }
      }
    } as never)
    await controller.play(target)
    expect(denied).toHaveBeenCalledOnce()
    expect(controller.snapshot.target).toBeNull()
  })
})
