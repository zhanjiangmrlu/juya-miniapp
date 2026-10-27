import { expect, it, vi } from 'vitest'

import { createWordAudioPort } from '@/services/word-audio-port'

import type { AudioFailure, AudioPort } from '@/shared/types/audio'

/** 用独立原生上下文模拟音源销毁后仍迟到的回调 */
const setup = () => {
  const tracks: (AudioPort & { events: Record<string, (reason?: AudioFailure) => void> })[] = []
  const factory = () => {
    const events: Record<string, (reason?: AudioFailure) => void> = {}
    const track = {
      src: '',
      currentTime: 0,
      duration: 1,
      playbackRate: 1,
      events,
      play: vi.fn(),
      pause: vi.fn(),
      stop: vi.fn(),
      seek: vi.fn(),
      destroy: vi.fn(),
      onPlay: (cb: () => void) => {
        events.play = cb
      },
      onPause: (cb: () => void) => {
        events.pause = cb
      },
      onEnded: (cb: () => void) => {
        events.ended = cb
      },
      onTimeUpdate: (cb: () => void) => {
        events.time = cb
      },
      onError: (cb: (reason?: AudioFailure) => void) => {
        events.error = cb
      }
    }
    tracks.push(track)
    return track
  }
  return { tracks, port: createWordAudioPort(factory) }
}

it('forwards current native error details but ignores errors and play events from a stopped source', () => {
  const { tracks, port } = setup()
  const error = vi.fn(),
    play = vi.fn()
  port.onError(error)
  port.onPlay(play)
  port.src = '/one.mp3'
  const first = tracks.at(-1)!
  port.play()
  port.stop()
  port.src = '/two.mp3'
  first.events.error?.({ errCode: 10003, errMsg: 'old file' })
  first.events.play?.()
  expect(error).not.toHaveBeenCalled()
  expect(play).not.toHaveBeenCalled()
  tracks.at(-1)!.events.error?.({ errCode: 10002, errMsg: 'network' })
  expect(error).toHaveBeenCalledWith({ errCode: 10002, errMsg: 'network' })
  port.destroy()
  tracks.at(-1)!.events.play?.()
  expect(play).not.toHaveBeenCalled()
})
