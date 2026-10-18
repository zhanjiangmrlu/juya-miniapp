import { describe, expect, it } from 'vitest'

import { createAudioController } from '@/features/learning/audio-controller'

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
