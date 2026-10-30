import { describe, expect, it, vi } from 'vitest'

import { createAudioController } from '@/services/audio-controller'

class AudioBoundary {
  playbackRate = 1
  src = ''
  currentTime = 0
  duration = 20
  playing = false
  destroyed = false
  callbacks: Record<string, () => void> = {}
  onPlay(callback: () => void) {
    this.callbacks.play = callback
  }
  onPause(callback: () => void) {
    this.callbacks.pause = callback
  }
  onEnded(callback: () => void) {
    this.callbacks.ended = callback
  }
  onError(callback: () => void) {
    this.callbacks.error = callback
  }
  onTimeUpdate(callback: () => void) {
    this.callbacks.time = callback
  }
  play() {
    this.playing = true
    this.callbacks.play?.()
  }
  pause() {
    this.playing = false
    this.callbacks.pause?.()
  }
  stop() {
    this.playing = false
    this.currentTime = 0
  }
  seek(value: number) {
    this.currentTime = value
  }
  destroy() {
    this.destroyed = true
    this.playing = false
  }
}
const setup = () => {
  const full = new AudioBoundary(),
    word = new AudioBoundary()
  const controller = createAudioController(full, word, undefined, { rate: 1 })
  return { full, word, controller }
}
describe('single whole-audio player and word pronunciation', () => {
  it('starts prepared whole audio synchronously and never resets the same source on resume or replay', async () => {
    const { full, controller } = setup()
    let source = '',
      writes = 0
    Object.defineProperty(full, 'src', {
      get: () => source,
      set: (value: string) => {
        source = value
        writes++
      }
    })
    controller.prepareFull('/local-full')
    expect(full.playing).toBe(false)
    const pending = controller.toggleFull(() => '/local-full')
    expect(full.playing).toBe(true)
    await pending
    full.currentTime = 5
    full.callbacks.time?.()
    await controller.toggleFull(() => '/local-full')
    await controller.toggleFull(() => '/local-full')
    expect(full.currentTime).toBe(5)
    full.callbacks.ended?.()
    await controller.toggleFull(() => '/local-full')
    expect(full.currentTime).toBe(0)
    expect(writes).toBe(1)
    controller.dispose()
  })

  it('never lets background preparation replace a playing or paused source', async () => {
    const { full, controller } = setup()
    await controller.toggleFull(() => '/streaming-full')
    controller.prepareFull('/late-file')
    expect(full.src).toBe('/streaming-full')
    await controller.toggleFull(() => '/streaming-full')
    controller.prepareFull('/late-file')
    expect(full.src).toBe('/streaming-full')
    controller.dispose()
  })

  it('reloads an expired paused source at its saved position and invalidates actual native errors', async () => {
    const full = new AudioBoundary(),
      failed = vi.fn()
    const controller = createAudioController(
      full,
      new AudioBoundary(),
      undefined,
      { rate: 1 },
      undefined,
      failed
    )
    await controller.toggleFull(() => '/old')
    full.currentTime = 7
    full.callbacks.time?.()
    await controller.toggleFull(() => '/old')
    await controller.toggleFull(() => '/renewed')
    expect(full.src).toBe('/renewed')
    expect(full.currentTime).toBe(7)
    full.callbacks.error?.()
    expect(failed).toHaveBeenCalledTimes(1)
    controller.dispose()
  })
  it('applies all five actual rates without starting paused audio or moving the playhead', async () => {
    const { full, word, controller } = setup()
    await controller.toggleFull(async () => '/full')
    full.currentTime = 8
    full.callbacks.time?.()
    for (const rate of [1, 1.25, 1.5, 1.75, 2]) {
      expect(controller.setRate(rate)).toBe(true)
      expect(full.playbackRate).toBe(rate)
      expect(controller.state.rate).toBe(rate)
      expect(full.currentTime).toBe(8)
      expect(full.playing).toBe(true)
      expect(word.playbackRate).toBe(1)
    }
    await controller.toggleFull(async () => '/full')
    controller.setRate(1.25)
    controller.seekFull(12)
    expect(full.playing).toBe(false)
    expect(full.currentTime).toBe(12)
    expect(full.playbackRate).toBe(1.25)
    controller.dispose()
  })
  it('restarts the native playback cycle at the current position so a latched rate takes effect', async () => {
    const { full, controller } = setup()
    let effectiveRate = 1
    const play = full.play.bind(full)
    full.play = () => {
      effectiveRate = full.playbackRate
      play()
    }
    await controller.toggleFull(async () => '/full')
    full.currentTime = 7.25
    full.callbacks.time?.()
    controller.setRate(1.5)
    expect(effectiveRate).toBe(1.5)
    expect(full.currentTime).toBe(7.25)
    expect(full.playing).toBe(true)
    await controller.toggleFull(async () => '/full')
    controller.setRate(2)
    expect(full.playing).toBe(false)
    expect(full.currentTime).toBe(7.25)
    controller.dispose()
  })
  it('does not seek an unready word and clears an earlier error once playback starts', async () => {
    const { word, controller } = setup()
    const seek = vi.spyOn(word, 'seek')
    await controller.playWord('one', async () => '/word')
    expect(seek).not.toHaveBeenCalled()
    word.callbacks.error?.()
    expect(controller.state.wordError).toBeTruthy()
    word.callbacks.play?.()
    expect(controller.state.wordStatus).toBe('error')
    await controller.playWord('one', async () => '/renewed-word')
    expect(controller.state.wordStatus).toBe('playing')
    expect(controller.state.wordError).toBe('')
    controller.dispose()
  })
  it('starts a prepared word synchronously without a promise boundary or another URL cache', async () => {
    const { word, controller } = setup()
    const load = vi.fn(() => '/local-word')
    const playing = controller.playWord('one', load)
    expect(word.playing).toBe(true)
    expect(word.src).toBe('/local-word')
    await playing
    word.callbacks.ended?.()
    await controller.playWord('one', load)
    expect(load).toHaveBeenCalledTimes(2)
    controller.dispose()
  })
  it('invalidates a failed word in the external preparation service', async () => {
    const word = new AudioBoundary(),
      failed = vi.fn()
    const controller = createAudioController(
      new AudioBoundary(),
      word,
      undefined,
      { rate: 1 },
      failed
    )
    await controller.playWord('one', async () => '/word')
    word.callbacks.error?.()
    expect(failed).toHaveBeenCalledWith('one')
    expect(controller.state.wordStatus).toBe('error')
    controller.dispose()
  })
  it('waits for native pause acknowledgement and coalesces rapid speed choices', async () => {
    const { full, controller } = setup()
    let effectiveRate = 1
    full.play = vi.fn(() => {
      full.playing = true
      effectiveRate = full.playbackRate
    })
    full.pause = vi.fn(() => {
      full.playing = false
    })
    await controller.toggleFull(async () => '/full')
    full.callbacks.play?.()
    full.currentTime = 8.5
    full.callbacks.time?.()
    controller.setRate(1.5)
    controller.setRate(2)
    expect(effectiveRate).toBe(1)
    expect(full.play).toHaveBeenCalledTimes(1)
    full.callbacks.pause?.()
    expect(effectiveRate).toBe(2)
    full.callbacks.play?.()
    expect(controller.state.rate).toBe(2)
    expect(full.currentTime).toBe(8.5)
    controller.dispose()
  })
  it('cancels pending native full playback when a word is selected between pause and play events', async () => {
    const { full, word, controller } = setup()
    full.play = vi.fn(() => {
      full.playing = true
    })
    full.pause = vi.fn(() => {
      full.playing = false
    })
    await controller.toggleFull(async () => '/full')
    full.callbacks.play?.()
    controller.setRate(1.5)
    full.callbacks.pause?.()
    await controller.playWord('one', async () => '/word')
    full.callbacks.play?.()
    expect(full.playing).toBe(false)
    expect(word.playing).toBe(true)
    expect(controller.state.status).toBe('paused')
    controller.dispose()
  })
  it('applies a second speed chosen while native resume is still pending', async () => {
    const { full, controller } = setup()
    let effectiveRate = 1
    full.play = vi.fn(() => {
      full.playing = true
      effectiveRate = full.playbackRate
    })
    full.pause = vi.fn(() => {
      full.playing = false
    })
    await controller.toggleFull(async () => '/full')
    full.callbacks.play?.()
    controller.setRate(1.5)
    full.callbacks.pause?.()
    controller.setRate(2)
    full.callbacks.play?.()
    expect(full.playing).toBe(false)
    full.callbacks.pause?.()
    full.callbacks.play?.()
    expect(effectiveRate).toBe(2)
    expect(controller.state.rate).toBe(2)
    expect(controller.state.status).toBe('playing')
    controller.dispose()
  })
  it('respects a manual pause while the automatic speed-change pause is pending', async () => {
    const { full, controller } = setup()
    full.pause = vi.fn(() => {
      full.playing = false
    })
    const play = vi.spyOn(full, 'play')
    await controller.toggleFull(async () => '/full')
    controller.setRate(2)
    await controller.toggleFull(async () => '/full')
    full.callbacks.pause?.()
    expect(play).toHaveBeenCalledTimes(1)
    expect(full.playing).toBe(false)
    expect(controller.state.rate).toBe(2)
    expect(controller.state.status).toBe('paused')
    controller.dispose()
  })
  it('keeps the latest rate after a manual pause cancels automatic resume', async () => {
    const { full, controller } = setup()
    full.pause = vi.fn(() => {
      full.playing = false
    })
    await controller.toggleFull(async () => '/full')
    controller.setRate(1.5)
    await controller.toggleFull(async () => '/full')
    controller.setRate(2)
    full.callbacks.pause?.()
    expect(controller.state.rate).toBe(2)
    expect(full.playing).toBe(false)
    controller.dispose()
  })
  it('keeps a user seek made during an automatic rate transition', async () => {
    const { full, controller } = setup()
    full.pause = vi.fn(() => {
      full.playing = false
    })
    await controller.toggleFull(async () => '/full')
    full.currentTime = 8.5
    full.callbacks.time?.()
    controller.setRate(1.5)
    controller.seekFull(12)
    full.callbacks.pause?.()
    expect(full.currentTime).toBe(12)
    expect(controller.state.position).toBe(12)
    controller.dispose()
  })
  it('keeps last effective speed when a native setter rejects a rate', () => {
    const { full, controller } = setup()
    Object.defineProperty(full, 'playbackRate', { get: () => 1, set: () => {} })
    expect(controller.setRate(1.75)).toBe(false)
    expect(controller.state.rate).toBe(1)
    expect(controller.state.rateError).toBeTruthy()
    expect(full.playing).toBe(false)
    controller.dispose()
  })
  it('retains session speed across scenes, word playback, retry and manual replay', async () => {
    const session = { rate: 1 as 1 | 1.25 | 1.5 | 1.75 | 2 }
    const full = new AudioBoundary(),
      word = new AudioBoundary()
    const first = createAudioController(full, word, undefined, session)
    first.setRate(1.75)
    await first.toggleFull(async () => '/first')
    await first.playWord('word', async () => '/word')
    expect(full.playing).toBe(false)
    expect(full.playbackRate).toBe(1.75)
    expect(word.playbackRate).toBe(1)
    full.callbacks.error?.()
    await first.toggleFull(async () => '/retry')
    expect(full.playbackRate).toBe(1.75)
    full.callbacks.ended?.()
    await first.toggleFull(async () => '/replay')
    expect(full.currentTime).toBe(0)
    expect(first.state.rate).toBe(1.75)
    first.dispose()
    const nextFull = new AudioBoundary()
    const next = createAudioController(nextFull, new AudioBoundary(), undefined, session)
    expect(next.state.rate).toBe(1.75)
    expect(nextFull.playing).toBe(false)
    await next.toggleFull(async () => '/next')
    expect(nextFull.playbackRate).toBe(1.75)
    next.dispose()
  })
  it('pauses whole audio at its position for a word and never automatically resumes it', async () => {
    const { full, word, controller } = setup()
    await controller.toggleFull(async () => '/full-ticket')
    full.currentTime = 8
    full.callbacks.time?.()
    await controller.playWord('coffee', async () => '/word-ticket')
    expect(full.playing).toBe(false)
    expect(full.currentTime).toBe(8)
    expect(word.playing).toBe(true)
    word.callbacks.ended?.()
    expect(full.playing).toBe(false)
    await controller.toggleFull(async () => '/full-ticket')
    expect(full.playing).toBe(true)
    expect(full.currentTime).toBe(8)
    expect(word.playing).toBe(false)
  })
  it('ignores a late word response after a different word is selected', async () => {
    const { word, controller } = setup()
    let finish!: (url: string) => void
    const first = controller.playWord(
      'first',
      () =>
        new Promise<string>((resolve) => {
          finish = resolve
        })
    )
    await controller.playWord('second', async () => '/second')
    finish('/first')
    await first
    expect(word.src).toBe('/second')
  })
  it('does not restart paused audio when dragging its position', async () => {
    const { full, controller } = setup()
    await controller.toggleFull(async () => '/full')
    await controller.toggleFull(async () => '/full')
    controller.seekFull(12)
    expect(full.currentTime).toBe(12)
    expect(full.playing).toBe(false)
  })
  it('cancels pending resources and destroys both players when leaving a scene', async () => {
    const { full, word, controller } = setup()
    let finish!: (url: string) => void
    const pending = controller.toggleFull(
      () =>
        new Promise<string>((resolve) => {
          finish = resolve
        })
    )
    controller.dispose()
    finish('/late')
    await pending
    expect(full.destroyed && word.destroyed).toBe(true)
    expect(full.playing || word.playing).toBe(false)
  })
})

it('stops only the selected popup word and leaves full playback position rate and intent unchanged', async () => {
  const { full, word, controller: player } = setup()
  const plays = vi.spyOn(full, 'play')
  await player.toggleFull(() => 'full')
  full.currentTime = 8
  full.callbacks.time?.()
  player.setRate(1.5)
  const before = { ...player.state }
  player.stopWord('popup:other')
  expect(player.state.status).toBe(before.status)
  expect(player.state.position).toBe(8)
  expect(player.state.rate).toBe(1.5)
  await player.playWord('popup:one', () => 'word')
  const count = plays.mock.calls.length
  player.stopWord('popup:one')
  expect(word.playing).toBe(false)
  expect(player.state.wordStatus).toBe('idle')
  expect(player.state.wordId).toBe(null)
  expect(plays).toHaveBeenCalledTimes(count)
  expect(player.state.status).toBe('paused')
  player.dispose()
})
