import { afterEach, expect, it, vi } from 'vitest'

import { createAudioController } from '@/features/learning/audio-controller'
import { ApiError } from '@/services/errors'

import type { AudioFailure, AudioPort } from '@/shared/types/audio'

/** 控制原生播放确认与错误的先后顺序 */
const track = () => {
  const events: Record<string, (reason?: AudioFailure) => void> = {}
  const port: AudioPort = {
    src: '',
    currentTime: 0,
    duration: 1,
    playbackRate: 1,
    play: vi.fn(),
    pause: vi.fn(),
    stop: vi.fn(),
    seek: vi.fn(),
    destroy: vi.fn(),
    onPlay: (cb) => {
      events.play = cb
    },
    onPause: (cb) => {
      events.pause = cb
    },
    onEnded: (cb) => {
      events.ended = cb
    },
    onTimeUpdate: (cb) => {
      events.time = cb
    },
    onError: (cb) => {
      events.error = cb
    }
  }
  return { port, events }
}
/** 创建待外部确认的异步权限结果 */
const permission = () => {
  let resolve!: (allowed: boolean) => void
  const promise = new Promise<boolean>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

afterEach(() => vi.useRealTimers())

it('shows loading and resolves audio concurrently with permission, without playing before approval', async () => {
  const full = track(),
    word = track(),
    auth = permission(),
    load = vi.fn(() => '/local.mp3')
  const controller = createAudioController(full.port, word.port)
  const pending = controller.playWord('one', load, () => auth.promise)
  expect(controller.state.wordStatus).toBe('loading')
  expect(load).toHaveBeenCalledOnce()
  expect(word.port.play).not.toHaveBeenCalled()
  auth.resolve(false)
  await pending
  expect(word.port.play).not.toHaveBeenCalled()
  expect(controller.state.wordStatus).toBe('idle')
  controller.dispose()
})

it('recovers temporary native failure twice at 250 and 750ms and then exposes a retry', async () => {
  vi.useFakeTimers()
  const full = track(),
    word = track(),
    failed = vi.fn(),
    authorize = vi.fn(async () => true)
  const controller = createAudioController(full.port, word.port, undefined, { rate: 1 }, failed)
  const load = vi.fn(() => '/remote.mp3')
  await controller.playWord('one', load, authorize)
  word.events.error?.({ errCode: 10002 })
  expect(controller.state.wordStatus).toBe('loading')
  await vi.advanceTimersByTimeAsync(249)
  expect(load).toHaveBeenCalledTimes(1)
  await vi.advanceTimersByTimeAsync(1)
  expect(load).toHaveBeenCalledTimes(2)
  word.events.error?.({ errCode: 10002 })
  await vi.advanceTimersByTimeAsync(749)
  expect(load).toHaveBeenCalledTimes(2)
  await vi.advanceTimersByTimeAsync(1)
  expect(load).toHaveBeenCalledTimes(3)
  expect(authorize).toHaveBeenCalledTimes(3)
  word.events.error?.({ errCode: 10002 })
  expect(controller.state.wordStatus).toBe('error')
  expect(controller.state.wordError).toBe('发音暂不可用，点击重试')
  await vi.advanceTimersByTimeAsync(5000)
  expect(load).toHaveBeenCalledTimes(3)
  controller.dispose()
})

it('re-downloads a bad local file only once and does not retry permanent or forbidden failures', async () => {
  vi.useFakeTimers()
  const full = track(),
    word = track()
  const controller = createAudioController(full.port, word.port)
  const load = vi.fn(() => 'wxfile://one.mp3')
  await controller.playWord('one', load)
  word.events.error?.({ errCode: 10004 })
  await vi.advanceTimersByTimeAsync(250)
  expect(load).toHaveBeenCalledTimes(2)
  word.events.error?.({ errCode: 10004 })
  await vi.advanceTimersByTimeAsync(3000)
  expect(load).toHaveBeenCalledTimes(2)
  expect(controller.state.wordStatus).toBe('error')
  const forbidden = vi
    .fn()
    .mockRejectedValue(new ApiError('learning_access_required', '需授权', 403))
  await controller.playWord('two', forbidden)
  await vi.advanceTimersByTimeAsync(3000)
  expect(forbidden).toHaveBeenCalledOnce()
  controller.dispose()
})

it('reissues expired speech grants but does not continue after leaving or switching words', async () => {
  vi.useFakeTimers()
  const full = track(),
    word = track(),
    failed = vi.fn()
  const controller = createAudioController(full.port, word.port, undefined, { rate: 1 }, failed)
  const load = vi
    .fn()
    .mockRejectedValueOnce(new ApiError('speech_grant_expired', '重新试听', 401))
    .mockResolvedValue('/renewed.mp3')
  await controller.playWord('one', load)
  await vi.advanceTimersByTimeAsync(250)
  expect(word.port.src).toBe('/renewed.mp3')
  word.events.error?.({ errCode: 10002 })
  await controller.playWord('two', () => '/two.mp3')
  await vi.advanceTimersByTimeAsync(1000)
  expect(word.port.src).toBe('/two.mp3')
  word.events.error?.({ errCode: 10002 })
  controller.dispose()
  await vi.advanceTimersByTimeAsync(1000)
  expect(word.port.play).toHaveBeenCalledTimes(2)
})

it('ignores native events after stopping a dictionary word while its preparation is pending', async () => {
  const full = track(),
    word = track(),
    wait = permission()
  const controller = createAudioController(full.port, word.port)
  const pending = controller.playWord('dictionary', async () => {
    await wait.promise
    return '/one.mp3'
  })
  controller.stopWord('dictionary')
  word.events.error?.({ errCode: 10002 })
  expect(controller.state.wordStatus).toBe('idle')
  wait.resolve(true)
  await pending
  expect(word.port.play).not.toHaveBeenCalled()
  controller.dispose()
})

it('leaves loading after a rejected permission request and never retries denied permissions', async () => {
  const full = track(),
    word = track()
  const controller = createAudioController(full.port, word.port)
  await controller.playWord(
    'one',
    () => '/one.mp3',
    async () => {
      throw new Error('offline')
    }
  )
  expect(controller.state.wordStatus).not.toBe('loading')
  expect(word.port.play).not.toHaveBeenCalled()
  controller.dispose()
})

it('does not let a late denied permission from a failed attempt cancel its newer recovery', async () => {
  vi.useFakeTimers()
  const full = track(),
    word = track(),
    old = permission()
  const controller = createAudioController(full.port, word.port)
  const authorize = vi.fn().mockReturnValueOnce(old.promise).mockResolvedValue(true)
  const load = vi
    .fn()
    .mockRejectedValueOnce(new ApiError('network_unknown', '网络暂不可用'))
    .mockResolvedValue('/new.mp3')
  await controller.playWord('one', load, authorize)
  await vi.advanceTimersByTimeAsync(250)
  word.events.play?.()
  expect(controller.state.wordStatus).toBe('playing')
  old.resolve(false)
  await Promise.resolve()
  expect(controller.state.wordStatus).toBe('playing')
  controller.dispose()
})

it('cancels preparations owned by the previous selection before switching or resuming full audio', async () => {
  const full = track(),
    word = track(),
    cancelSelection = vi.fn()
  const controller = createAudioController(
    full.port,
    word.port,
    undefined,
    undefined,
    undefined,
    undefined,
    cancelSelection
  )
  await controller.playWord('vocabulary', () => '/one.mp3')
  await controller.playWord('dictionary', () => '/two.mp3')
  expect(cancelSelection).toHaveBeenCalledOnce()
  await controller.toggleFull(() => '/full.mp3')
  expect(cancelSelection).toHaveBeenCalledTimes(2)
  controller.dispose()
})

it('shares the foreground budget across real vocabulary and dictionary preparation services', async () => {
  const { createWordAudioPreparation } = await import('@/services/word-audio-preparation')
  const activeJobs = new Set<string>()
  const ports = {
    active: () => true,
    onFailure: vi.fn(),
    resolve: (id: string, task: import('@/shared/types/pronunciation').WordAudioCancellation) => {
      activeJobs.add(id)
      task.onCancel(() => activeJobs.delete(id))
      return new Promise<string>(() => {})
    },
    download: vi.fn(async (url: string) => ({ src: url, release: vi.fn() }))
  }
  const vocabulary = createWordAudioPreparation(ports),
    dictionary = createWordAudioPreparation(ports)
  const full = track(),
    word = track()
  const controller = createAudioController(
    full.port,
    word.port,
    undefined,
    undefined,
    undefined,
    undefined,
    () => {
      vocabulary.cancelSelection()
      dictionary.cancelSelection()
    }
  )
  vocabulary.prefetch(['background'])
  const first = controller.playWord('selected', () => vocabulary.load('selected'))
  const second = controller.playWord('dictionary', () => dictionary.load('lookup'))
  expect([...activeJobs]).toEqual(['background', 'lookup'])
  await controller.toggleFull(() => '/full.mp3')
  expect([...activeJobs]).toEqual(['background'])
  await Promise.all([first, second])
  controller.dispose()
  vocabulary.dispose()
  dictionary.dispose()
})
