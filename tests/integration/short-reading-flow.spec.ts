import { describe, expect, it } from 'vitest'

import { createShortReadingService } from '@/features/short-reading/short-reading-service'

import { createIntegrationClient } from './mock-client'

describe('独立短文共享请求契约流程', () => {
  it('列表、安全预览、有无音频详情、独立进度与重复读完', async () => {
    const client = createIntegrationClient()
    const service = createShortReadingService(client)
    const list = await service.list()
    expect(list.items.map((item) => item.content_id)).toEqual([
      'reading-small-favor',
      'reading-walk-audio',
      'reading-urban-gardens'
    ])
    for (const item of list.items) {
      expect(item).not.toHaveProperty('paragraphs_en')
      expect(item).not.toHaveProperty('translation_zh')
      expect(item).not.toHaveProperty('whole_audio')
    }
    const preview = await service.preview('reading-urban-gardens')
    expect(preview.intro).toBe('了解小型花园如何改变城市空间。')
    await expect(service.open(preview.content_id)).rejects.toMatchObject({ status: 403 })
    const reading = await service.open('reading-small-favor')
    expect(reading.whole_audio).toBeNull()
    expect(reading.paragraphs_en).toHaveLength(3)
    expect(reading.progress.content_type).toBe('short_reading')
    const position = await service.savePosition(
      reading.content_id,
      {
        content_version: reading.content_version,
        client_sequence: 19,
        paragraph_id: 'favor-p2',
        offset: 0
      },
      'reading-progress-key'
    )
    expect(position.content_type).toBe('short_reading')
    expect(position.content_version).toBe(2)
    expect(position.position?.paragraph_id).toBe('favor-p2')
    const completed = await service.complete(
      reading.content_id,
      reading.content_version,
      'reading-complete-key'
    )
    const repeated = await service.complete(
      reading.content_id,
      reading.content_version,
      'reading-complete-key'
    )
    expect(completed.progress.completed_at).toBeTruthy()
    expect(repeated.progress.completed_at).toBe(completed.progress.completed_at)
    expect(repeated.created).toBe(completed.created)
    expect(completed).not.toHaveProperty('checkin_date')
    expect(completed.progress).not.toHaveProperty('scene_id')
    const audioReading = await service.open('reading-walk-audio')
    expect(audioReading.whole_audio?.target_type).toBe('short_reading_whole')
    const signed = await service.getSignedUrl(audioReading.whole_audio!)
    expect(signed.url).toBe('/static/fixtures/silence.wav')
  })
})
