import { describe, expect, it, vi } from 'vitest'

import { createShortReadingService } from '@/features/short-reading/short-reading-service'

/** 提供方案05的纯阅读详情 fixture，不引入场景词条或讲解 */
const detailFixture = () => ({
  content_type: 'short_reading',
  content_id: 'reading/1',
  content_version: 2,
  revision_id: 'revision/2',
  title_en: 'A Small Favor',
  title_zh: '一个小忙',
  category: '生活短文',
  topic: '邻里',
  level: 'A2',
  schema_version: 2,
  introduction: '一次小小的帮助',
  cover_url: null,
  access: 'TRIAL',
  paragraphs_en: [{ paragraph_id: 'p1', english: 'A small favor made us feel closer.' }],
  translation_zh: '一个小小的帮助让我们觉得更亲近',
  whole_audio: null,
  progress: {
    content_id: 'reading/1',
    saved_content_version: 2,
    paragraph_id: 'p1',
    offset: 0,
    started_at: '2026-10-11T01:00:00Z',
    last_read_at: '2026-10-11T01:00:00Z',
    client_sequence: 0,
    completed_at: null
  }
})

describe('短文方案05契约', () => {
  it('schema不兼容或进度属于其他短文时不接收混合详情', async () => {
    const client = {
      get: vi.fn(),
      post: vi
        .fn()
        .mockResolvedValueOnce({ ...detailFixture(), schema_version: 3 })
        .mockResolvedValueOnce({
          ...detailFixture(),
          progress: { ...detailFixture().progress, content_id: 'other' }
        }),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn()
    }
    const service = createShortReadingService(client)
    await expect(service.open('reading/1')).rejects.toMatchObject({ status: 409 })
    await expect(service.open('reading/1')).rejects.toMatchObject({ status: 409 })
  })

  it('全文资源绑定短文和修订签名，错配资源不能进入播放', async () => {
    const client = {
      get: vi.fn().mockResolvedValue({
        resource_id: 'other-target',
        url: 'https://audio.test/file',
        expires_at: '2099-01-01T00:00:00Z'
      }),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn()
    }
    const service = createShortReadingService(client)
    const target = {
      content_type: 'short_reading' as const,
      content_id: 'reading/1',
      content_version: 2,
      revision_id: 'revision/2',
      target_type: 'short_reading_whole',
      target_id: 'whole/1',
      resource_id: 'whole/1',
      version_id: 'audio2'
    }
    await expect(service.getSignedUrl(target)).rejects.toMatchObject({ status: 503 })
    expect(client.get).toHaveBeenCalledWith(
      '/api/v1/short-readings/reading%2F1/resources/whole%2F1/signed-url?revision_id=revision%2F2'
    )
    client.get.mockResolvedValueOnce({
      resource_id: 'whole/1',
      url: 'https://audio.test/file',
      expires_at: '2099-01-01T00:00:00Z'
    })
    expect(await service.getSignedUrl(target)).toMatchObject({
      target_id: 'whole/1',
      resource_id: 'whole/1'
    })
  })
  it('即便open错误地带全文，PREVIEW访问等级仍不能进入正文', async () => {
    const client = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({ ...detailFixture(), access: 'PREVIEW' }),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn()
    }
    await expect(createShortReadingService(client).open('reading/1')).rejects.toMatchObject({
      status: 403
    })
  })
  it('安全预览显式丢弃误带的全文、音频和精确位置', async () => {
    const client = {
      get: vi.fn().mockResolvedValue(detailFixture()),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn()
    }
    const preview = await createShortReadingService(client).preview('reading/1')
    expect(preview).not.toHaveProperty('paragraphs_en')
    expect(preview).not.toHaveProperty('translation_zh')
    expect(preview).not.toHaveProperty('whole_audio')
    expect(preview).not.toHaveProperty('progress')
  })
  it('禁止将其他短文的完成响应更新成本篇读完状态', async () => {
    const client = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({
        progress: {
          ...detailFixture().progress,
          content_id: 'other-reading',
          completed_at: '2026-10-11'
        },
        created: true
      }),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn()
    }
    await expect(
      createShortReadingService(client).complete('reading/1', 2, 'complete-key')
    ).rejects.toMatchObject({ status: 409 })
  })
  it('授权详情只请求独立短文open，无音频仍有完整自然段和译文', async () => {
    const client = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue(detailFixture()),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn()
    }
    const reading = await createShortReadingService(client).open('reading/1')
    expect(client.post).toHaveBeenCalledWith('/api/v1/short-readings/reading%2F1/open')
    expect(reading.whole_audio).toBeNull()
    expect(reading.paragraphs_en[0].text).toBe('A small favor made us feel closer.')
    expect(reading.translation_zh).toBe('一个小小的帮助让我们觉得更亲近')
    expect(reading.intro).toBe('一次小小的帮助')
    expect(reading.progress.position).toEqual({ paragraph_id: 'p1', offset: 0 })
  })

  it('位置按短文、版本、段落锚点和客户端序号独立写入', async () => {
    const client = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn().mockResolvedValue({}),
      delete: vi.fn(),
      patch: vi.fn()
    }
    const position = { content_version: 2, paragraph_id: 'p1', offset: 14, client_sequence: 7 }
    await createShortReadingService(client).savePosition(
      'reading/1',
      position,
      'reading-progress-key'
    )
    expect(client.put).toHaveBeenCalledWith(
      '/api/v1/short-readings/reading%2F1/progress',
      position,
      { idempotencyKey: 'reading-progress-key' }
    )
  })

  it('读完命令只进入短文complete，不发场景完成或打卡请求', async () => {
    const client = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({
        progress: { ...detailFixture().progress, completed_at: '2026-10-11' },
        created: true
      }),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn()
    }
    await createShortReadingService(client).complete('reading/1', 2, 'reading-complete-key')
    expect(client.post).toHaveBeenCalledWith(
      '/api/v1/short-readings/reading%2F1/complete',
      { content_version: 2 },
      { idempotencyKey: 'reading-complete-key' }
    )
  })
})
