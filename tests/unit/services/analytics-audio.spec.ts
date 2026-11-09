import { expect, it, vi } from 'vitest'

import { analytics } from '@/services/analytics'
import { createAudioAnalytics } from '@/services/analytics-audio'

it('retains a dictionary word location without duplicating content and version UUIDs', () => {
  const track = vi.spyOn(analytics, 'track')
  try {
    const content = '11111111-1111-1111-1111-111111111111',
      version = '22222222-2222-2222-2222-222222222222',
      line = '33333333-3333-3333-3333-333333333333'
    const observe = createAudioAnalytics({
      content_type: 'scene',
      content_id: content,
      version_id: version
    })
    observe('audio_play', {
      audio_kind: 'word',
      word_id: `dictionary:${content}:${version}:${line}:100:105`
    })
    expect(track).toHaveBeenCalledWith('audio_play', {
      content_type: 'scene',
      content_id: content,
      version_id: version,
      audio_kind: 'word',
      word_id: `${line}:100:105`
    })
  } finally {
    track.mockRestore()
  }
})
