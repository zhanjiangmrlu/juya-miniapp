import { flushPromises } from '@vue/test-utils'
import { afterEach, expect, it, vi } from 'vitest'

import { createBackgroundAudioPort } from '@/services/background-audio-port'

/** 模拟设置地址立即播放的微信单例，不访问网络或声卡 */
const setup = () => {
  const events: Record<string, () => void> = {}
  let source = ''
  const native = {
    title: '',
    currentTime: 0,
    duration: 80,
    startTime: 0,
    playbackRate: 1,
    paused: true,
    get src() {
      return source
    },
    set src(value: string) {
      source = value
      native.currentTime = native.startTime
      native.play()
    },
    play: vi.fn(() => {
      native.paused = false
      events.play?.()
    }),
    pause: vi.fn(() => {
      native.paused = true
      events.pause?.()
    }),
    stop: vi.fn(() => {
      native.paused = true
      source = ''
      native.currentTime = 0
      events.stop?.()
    }),
    seek: vi.fn((seconds: number) => {
      native.currentTime = seconds
    }),
    onPlay: vi.fn((cb: () => void) => {
      events.play = cb
    }),
    onPause: vi.fn((cb: () => void) => {
      events.pause = cb
    }),
    onStop: vi.fn((cb: () => void) => {
      events.stop = cb
    }),
    onEnded: vi.fn((cb: () => void) => {
      events.ended = cb
    }),
    onError: vi.fn((cb: () => void) => {
      events.error = cb
    }),
    onTimeUpdate: vi.fn((cb: () => void) => {
      events.time = cb
    })
  }
  return { native, events }
}
afterEach(() => vi.unstubAllGlobals())

it('waits for native pause acknowledgement before authorizing an external resume', async () => {
  const { native, events } = setup()
  const resume = vi.fn(async () => {})
  const port = createBackgroundAudioPort(native, { title: '文章', resume, leave: () => {} })
  port.src = 'https://media.test/full.mp3'
  port.play()
  port.pause()
  native.pause.mockImplementation(() => {
    native.paused = true
  })
  native.play()
  await flushPromises()
  expect(resume).not.toHaveBeenCalled()
  events.pause?.()
  await flushPromises()
  expect(resume).toHaveBeenCalledTimes(1)
  port.destroy()
})

it('does not interpret a cancelled command play event as a new headset request', async () => {
  const { native, events } = setup()
  const resume = vi.fn(async () => {})
  const port = createBackgroundAudioPort(native, { title: '文章', resume, leave: () => {} })
  port.src = 'https://media.test/full.mp3'
  port.play()
  native.pause.mockImplementation(() => {
    native.paused = true
  })
  port.pause()
  native.paused = false
  events.play?.()
  events.pause?.()
  await flushPromises()
  expect(resume).not.toHaveBeenCalled()
  expect(native.paused).toBe(true)
  port.destroy()
})

it('stages sources silently and sets title, position and rate before the first native playback', () => {
  const { native } = setup()
  const port = createBackgroundAudioPort(native, {
    title: '银行',
    resume: async () => {},
    leave: () => {}
  })
  port.prepare?.('https://media.test/full.mp3')
  expect(native.src).toBe('')
  expect(native.play).not.toHaveBeenCalled()
  port.seek(12)
  port.playbackRate = 1.75
  port.play()
  expect(native.title).toBe('银行')
  expect(native.currentTime).toBe(12)
  expect(native.playbackRate).toBe(1.75)
  expect(native.play).toHaveBeenCalledTimes(1)
  port.destroy()
})

it('holds external playback until the page authorizes resume and cancels it after a newer pause', async () => {
  const { native } = setup()
  let confirm!: () => void
  const resume = vi.fn(async (active: () => boolean) => {
    await new Promise<void>((resolve) => {
      confirm = resolve
    })
    if (active()) port.play()
  })
  const port = createBackgroundAudioPort(native, { title: '文章', resume, leave: () => {} })
  port.src = 'https://media.test/full.mp3'
  port.play()
  port.pause()
  native.play()
  await flushPromises()
  expect(native.paused).toBe(true)
  expect(resume).toHaveBeenCalledTimes(1)
  port.pause()
  confirm()
  await flushPromises()
  expect(native.paused).toBe(true)
  port.destroy()
})

it('resumes a system-stopped source at its last position and ignores stale play events', async () => {
  const { native, events } = setup()
  const port = createBackgroundAudioPort(native, {
    title: '文章',
    resume: async (active) => {
      if (active()) port.play()
    },
    leave: () => {}
  })
  const stopped = vi.fn()
  port.onStop?.(stopped)
  port.src = 'https://media.test/full.mp3'
  port.play()
  native.currentTime = 19
  events.time?.()
  native.stop()
  expect(stopped).toHaveBeenCalledTimes(1)
  native.play()
  await flushPromises()
  expect(native.currentTime).toBe(19)
  port.pause()
  events.play?.()
  await flushPromises()
  expect(native.paused).toBe(true)
  port.destroy()
})

it('registers native listeners once and disposing an old owner cannot stop the new source', () => {
  const { native } = setup()
  const oldPlay = vi.fn(),
    leave = vi.fn()
  const first = createBackgroundAudioPort(native, {
    title: '旧文章',
    resume: async () => {},
    leave
  })
  first.onPlay(oldPlay)
  first.src = 'https://media.test/old.mp3'
  first.play()
  const second = createBackgroundAudioPort(native, {
    title: '新文章',
    resume: async () => {},
    leave: () => {}
  })
  second.src = 'https://media.test/new.mp3'
  second.play()
  first.destroy()
  expect(native.src).toBe('https://media.test/new.mp3')
  expect(native.paused).toBe(false)
  expect(oldPlay).toHaveBeenCalledTimes(1)
  expect(native.onPlay).toHaveBeenCalledTimes(1)
  expect(leave).toHaveBeenCalledTimes(1)
  second.destroy()
})

it('does not apply an old stop or pause event to the newly playing owner', () => {
  const { native, events } = setup()
  const first = createBackgroundAudioPort(native, {
    title: '旧文章',
    resume: async () => {},
    leave: () => {}
  })
  first.src = 'https://media.test/old.mp3'
  first.play()
  const second = createBackgroundAudioPort(native, {
    title: '新文章',
    resume: async () => {},
    leave: () => {}
  })
  const stopped = vi.fn(),
    paused = vi.fn()
  second.onStop?.(stopped)
  second.onPause(paused)
  second.src = 'https://media.test/new.mp3'
  second.play()
  events.stop?.()
  events.pause?.()
  expect(stopped).not.toHaveBeenCalled()
  expect(paused).not.toHaveBeenCalled()
  expect(native.paused).toBe(false)
  second.destroy()
})

it('stops a late system play after the resource session has released its native owner', () => {
  const { native } = setup()
  const resume = vi.fn(async () => {})
  const port = createBackgroundAudioPort(native, { title: '文章', resume, leave: () => {} })
  port.src = 'https://media.test/full.mp3'
  port.play()
  port.destroy()
  native.play()
  expect(native.paused).toBe(true)
  expect(resume).not.toHaveBeenCalled()
})
