import { describe, expect, it } from 'vitest'

import { MockTransport } from '@/services/mock/mock-transport'
import { HttpMethod } from '@/shared/enums/http'

import type { components } from '../../../fixtures/contracts/v15-a9a97b8/provider'

describe('显式Mock历史分页消费者', () => {
  it('独立阅读总数覆盖下线记录，摘要分页不含正文或锚点', async () => {
    const transport = new MockTransport()
    const read = (cursor = '') =>
      transport.request<components['schemas']['ReadingHistoryPage']>({
        method: HttpMethod.GET,
        timeout: 1000,
        url: `https://mock.test/api/v1/short-readings/history${cursor ? `?cursor=${cursor}` : ''}`,
        headers: {}
      })
    const first = await read()
    expect(first.status).toBe(200)
    expect(first.data).toMatchObject({ started_count: 3, completed_count: 2, has_more: true })
    const second = await read(first.data.next_cursor!)
    expect(second.data).toMatchObject({ has_more: false, next_cursor: null })
    expect(second.data.items[0]).toMatchObject({ title_zh: '短文已下线', can_open: false })
    for (const item of [...first.data.items, ...second.data.items]) {
      expect(item).not.toHaveProperty('paragraphs_en')
      expect(item).not.toHaveProperty('paragraph_id')
      expect(item).not.toHaveProperty('whole_audio')
    }
  })
  it('场景历史显式提供游标并可读取第二页', async () => {
    const transport = new MockTransport()
    const read = (cursor = '') =>
      transport.request<components['schemas']['SceneHistoryPageResponse']>({
        method: HttpMethod.GET,
        timeout: 1000,
        url: `https://mock.test/api/v1/history/scenes${cursor ? `?cursor=${cursor}` : ''}`,
        headers: {}
      })
    const first = await read()
    expect(first.data.has_more).toBe(true)
    const second = await read(first.data.next_cursor!)
    expect(second.data.has_more).toBe(false)
    expect(second.data.items[0].scene_id).not.toBe(first.data.items[0].scene_id)
  })
})
