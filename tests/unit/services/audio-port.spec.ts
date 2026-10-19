import { afterEach, expect, it, vi } from 'vitest'

import { createAudioController } from '@/features/learning/audio-controller'
import { createAudioPort } from '@/services/audio-port'

/** 模拟浏览器规范化地址和媒体加载，不使用网络或真实声卡 */
class BrowserAudio extends EventTarget {
  static instances: BrowserAudio[] = []
  autoplay = false
  preservesPitch = true
  preload = 'metadata'
  playbackRate = 1
  currentTime = 0
  duration = 30
  readyState = 4
  writes = 0
  source = ''
  load = vi.fn()
  pause = vi.fn()
  play = vi.fn(async () => {
    this.dispatchEvent(new Event('play'))
  })
  removeAttribute = vi.fn()
  constructor() {
    super()
    BrowserAudio.instances.push(this)
  }
  get src() {
    return this.source ? `https://example.com${this.source}` : ''
  }
  set src(value: string) {
    this.source = value
    this.writes++
  }
}
afterEach(() => {
  BrowserAudio.instances.length = 0
  vi.unstubAllGlobals()
})

it('warms only the full browser player without autoplay and reuses its normalized source on click', async () => {
  vi.stubGlobal('Audio', BrowserAudio)
  const full = createAudioPort(),
    word = createAudioPort()
  const controller = createAudioController(full, word, undefined, { rate: 1 })
  controller.prepareFull('/full')
  const audio = BrowserAudio.instances[0]!
  expect(audio.preload).toBe('auto')
  expect(audio.load).toHaveBeenCalledTimes(1)
  expect(audio.play).not.toHaveBeenCalled()
  expect(BrowserAudio.instances[1]!.preload).toBe('metadata')
  await controller.toggleFull(() => '/full')
  expect(audio.writes).toBe(1)
  expect(audio.play).toHaveBeenCalledTimes(1)
  controller.dispose()
})
