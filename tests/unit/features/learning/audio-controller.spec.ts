import { describe, expect, it } from 'vitest'

import { createAudioController } from '@/features/learning/audio-controller'

class AudioBoundary {
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
  const controller = createAudioController(full, word)
  return { full, word, controller }
}
describe('single whole-audio player and word pronunciation', () => {
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
