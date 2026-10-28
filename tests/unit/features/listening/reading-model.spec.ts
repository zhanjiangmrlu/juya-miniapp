import { describe, expect, it } from 'vitest'

import {
  characterFrame,
  restoreProgress,
  tokenizeBody,
  validateTimeline
} from '@/features/listening/reading-model'

describe('published listening reading state', () => {
  const words = [
    { start: 0, end: 4, start_ms: 0, end_ms: 400, sentence_id: 's1' },
    { start: 5, end: 9, start_ms: 600, end_ms: 1000, sentence_id: 's1' },
    { start: 10, end: 14, start_ms: 1200, end_ms: 1600, sentence_id: 's2' }
  ]
  it('advances characters using original media milliseconds and removes the previous sentence trail', () => {
    expect(characterFrame(words, 150, false).current).toBe(1)
    expect(characterFrame(words, 150, false).fraction).toBeCloseTo(0.5)
    expect(characterFrame(words, 1250, false).trails.every((item) => item.position >= 10)).toBe(
      true
    )
    expect(characterFrame(words, 1600, true).trails).toEqual([])
    expect(characterFrame(words, 1600, true).current).toBe(-1)
  })
  it('reconstructs paused and seeked frames without depending on wall time', () => {
    const frozen = characterFrame(words, 750, false)
    expect(characterFrame(words, 750, false)).toEqual(frozen)
    expect(characterFrame(words, 50, false).current).toBe(0)
    expect(characterFrame(words, 750, false).current).toBe(6)
  })
  it('rejects invalid spans, overlaps, empty timelines and audio overruns', () => {
    expect(validateTimeline('This word next', words, 1600)).toBe(true)
    expect(validateTimeline('This word next', [], 1600)).toBe(false)
    expect(validateTimeline('This word next', [{ ...words[0]!, end: 90 }], 1600)).toBe(false)
    expect(validateTimeline('This word next', [{ ...words[0]!, end_ms: 1700 }], 1600)).toBe(false)
    expect(
      validateTimeline('This word next', [words[0]!, { ...words[1]!, start_ms: 300 }], 1600)
    ).toBe(false)
  })
  it('keeps code point offsets and untouched natural paragraphs for dictionary lookup', () => {
    const tokens = tokenizeBody('🌱 This\n\nword’s end.')
    expect(tokens.map((p) => p.tokens.map((t) => t.text).join('') + p.separator).join('')).toBe(
      '🌱 This\n\nword’s end.'
    )
    expect(tokens[0]!.tokens.find((t) => t.text === 'This')).toMatchObject({
      start: 2,
      end: 6,
      word: true
    })
    expect(tokens[2]!.tokens.find((t) => t.word)).toMatchObject({
      text: 'word’s',
      start: 8,
      end: 14
    })
  })
  it('restores only the same published version, never auto plays or copies old version state', () => {
    const old = {
      version_id: 'v1',
      reading_position: 600,
      translation_open: true,
      audio_position: 30,
      playback_rate: 1.5 as const
    }
    expect(restoreProgress('v1', old)).toMatchObject(old)
    expect(restoreProgress('v2', old)).toEqual({
      version_id: 'v2',
      reading_position: 0,
      translation_open: false,
      audio_position: 0,
      playback_rate: 1
    })
  })
})
