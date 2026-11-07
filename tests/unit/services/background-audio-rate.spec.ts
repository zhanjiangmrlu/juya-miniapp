import { flushPromises } from '@vue/test-utils'
import { expect, it, vi } from 'vitest'

import { createAudioController } from '@/services/audio-controller'
import { createBackgroundAudioPort } from '@/services/background-audio-port'

/** 按真机采样模拟倍率只在新音源绑定时生效，原生事件可延迟交付 */
const setup = (rejectRate = false) => {
  const events: Record<string, () => void> = {}
  let source = '',
    desired = 1,
    actual = 1
  const native = {
    title: '',
    startTime: 0,
    currentTime: 0,
    duration: 100,
    paused: true,
    get src() {
      return source
    },
    set src(value: string) {
      source = value
      actual = rejectRate ? 1 : desired
      native.currentTime = native.startTime
      native.paused = false
    },
    get playbackRate() {
      return actual
    },
    set playbackRate(value: number) {
      desired = value
    },
    play: vi.fn(() => {
      native.paused = false
    }),
    pause: vi.fn(() => {
      native.paused = true
      events.pause?.()
    }),
    stop: vi.fn(() => {
      native.paused = true
      source = ''
      native.currentTime = 0
    }),
    seek: vi.fn((seconds: number) => {
      native.currentTime = seconds
    }),
    onPlay: (cb: (result: unknown) => void) => {
      events.play = () => cb(undefined)
    },
    onPause: (cb: (result: unknown) => void) => {
      events.pause = () => cb(undefined)
    },
    onStop: (cb: (result: unknown) => void) => {
      events.stop = () => cb(undefined)
    },
    onEnded: (cb: (result: unknown) => void) => {
      events.ended = () => cb(undefined)
    },
    onTimeUpdate: (cb: (result: unknown) => void) => {
      events.time = () => cb(undefined)
    },
    onError: (cb: (result: unknown) => void) => {
      events.error = () => cb(undefined)
    }
  }
  const resume = vi.fn(async () => {})
  const full = createBackgroundAudioPort(native, { title: '音频', resume, leave: () => {} })
  const word = {
    ...full,
    play: vi.fn(),
    pause: vi.fn(),
    stop: vi.fn(),
    destroy: vi.fn(),
    onPlay: vi.fn(),
    onPause: vi.fn(),
    onEnded: vi.fn(),
    onError: vi.fn(),
    onTimeUpdate: vi.fn()
  }
  const controller = createAudioController(full, word, () => {}, { rate: 1 })
  return { native, events, full, controller, resume }
}

it('rebinds a paused native source at its captured position and confirms the requested rate only on native play', async () => {
  const { native, events, controller, resume } = setup()
  await controller.toggleFull(() => '/full')
  events.play?.()
  native.currentTime = 12.5
  events.time?.()
  controller.setRate(1.5)
  expect(controller.state.rate).toBe(1)
  expect(controller.state.rateError).toBe('')
  expect(native.playbackRate).toBe(1.5)
  expect(native.currentTime).toBe(12.5)
  events.stop?.() // 旧音源 stop 晚于新 src
  events.pause?.() // 旧暂停回调不能覆盖播放中新音源
  events.play?.()
  events.play?.() // 重复原生通知不能创建外部续播验权循环
  await flushPromises()
  expect(controller.state).toMatchObject({
    rate: 1.5,
    rateError: '',
    status: 'playing',
    position: 12.5
  })
  expect(resume).not.toHaveBeenCalled()
  controller.dispose()
})

it('stages a paused rate selection without starting audio and confirms it after the next explicit play', async () => {
  const { native, events, controller } = setup()
  await controller.toggleFull(() => '/full')
  events.play?.()
  controller.pauseFull()
  controller.setRate(1.5)
  expect(native.paused).toBe(true)
  expect(controller.state.rate).toBe(1)
  await controller.toggleFull(() => '/full')
  events.play?.()
  expect(controller.state).toMatchObject({ rate: 1.5, rateError: '', status: 'playing' })
  controller.dispose()
})

it.each(['pause', 'pdf', 'word', 'dispose'])(
  'cancels pending rate rebind playback when %s intervenes',
  async (action) => {
    const { native, events, controller, resume } = setup()
    await controller.toggleFull(() => '/full')
    events.play?.()
    controller.setRate(1.5)
    if (action === 'pause') controller.pauseFull()
    else if (action === 'pdf') controller.suspend()
    else if (action === 'word') await controller.playWord('w1', () => '/word')
    else controller.dispose()
    events.stop?.()
    events.pause?.()
    events.play?.()
    await flushPromises()
    expect(native.paused).toBe(true)
    expect(controller.state.status).not.toBe('playing')
    expect(resume).not.toHaveBeenCalled()
    controller.dispose()
  }
)

it('retains a visible error if the native player rejects the rate even after rebinding', async () => {
  const { events, controller } = setup(true)
  await controller.toggleFull(() => '/full')
  events.play?.()
  controller.setRate(1.5)
  expect(controller.state.rate).toBe(1)
  expect(controller.state.rateError).toBe('')
  events.play?.()
  expect(controller.state.rate).toBe(1)
  expect(controller.state.rateError).toContain('当前设备未能设置')
  controller.dispose()
})

it('applies the last requested rate when another selection arrives before native rebind play', async () => {
  const { native, events, controller } = setup()
  await controller.toggleFull(() => '/full')
  events.play?.()
  controller.setRate(1.5)
  controller.setRate(1.25)
  events.play?.()
  events.stop?.()
  events.play?.()
  expect(native.playbackRate).toBe(1.25)
  expect(controller.state).toMatchObject({ rate: 1.25, rateError: '', status: 'playing' })
  controller.dispose()
})

it.each(['error', 'stop', 'ended'])(
  'clears pending confirmation after a genuine native %s',
  async (event) => {
    const { native, events, controller } = setup()
    await controller.toggleFull(() => '/full')
    events.play?.()
    controller.setRate(1.5)
    // 先交付重绑停止的旧回调，再发真正的新会话终止
    events.stop?.()
    native.paused = true
    events[event]?.()
    expect(controller.state.pendingRate).toBeUndefined()
    expect(controller.state.rate).toBe(1)
    controller.dispose()
  }
)

it('acknowledges an owned native play when paused is stale true at callback delivery and then advances normally', async () => {
  const { native, events, controller } = setup()
  await controller.toggleFull(() => '/full')
  events.play?.()
  native.currentTime = 3.47
  events.time?.()
  controller.setRate(1.5)
  // 真机seq62：原生已发onPlay且rate1.5生效，但paused第一次仍读到旧true
  let reads = 0,
    paused = false
  Object.defineProperty(native, 'paused', {
    configurable: true,
    get: () => (reads++ === 0 ? true : paused),
    set: (value: boolean) => {
      paused = value
    }
  })
  events.play?.()
  expect(controller.state).toMatchObject({
    status: 'playing',
    rate: 1.5,
    rateError: ''
  })
  expect(controller.state.pendingRate).toBeUndefined()
  controller.setRate(1.75)
  events.play?.()
  expect(controller.state).toMatchObject({
    status: 'playing',
    rate: 1.75,
    rateError: ''
  })
  expect(controller.state.pendingRate).toBeUndefined()
  await controller.toggleFull(() => '/unused')
  expect(native.paused).toBe(true)
  expect(controller.state.status).toBe('paused')
  // 用户主动暂停后的旧onPlay不能被当成尚未确认的受控start
  events.play?.()
  expect(native.paused).toBe(true)
  expect(controller.state.status).toBe('paused')
  controller.dispose()
})
