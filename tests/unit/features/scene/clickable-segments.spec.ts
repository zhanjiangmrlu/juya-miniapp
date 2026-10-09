import { describe, expect, it } from 'vitest'

import { createClickableSegments } from '@/features/scene/clickable-segments'

describe('Unicode 点击片段', () => {
  it('按 code point 切分表情后的英文，重叠语块优先于词汇', () => {
    const segments = createClickableSegments(
      '☕😀 Get a latte.',
      [
        { start: 9, end: 14, entry_id: 'word', entry_version: 1, source_locator: 'word-source' },
        { start: 3, end: 14, entry_id: 'chunk', entry_version: 2, source_locator: 'chunk-source' }
      ],
      [
        { entry_id: 'word', entry_type: 'VOCABULARY' },
        { entry_id: 'chunk', entry_type: 'PHRASE' }
      ] as never
    )
    expect(segments.map((segment) => segment.text).join('')).toBe('☕😀 Get a latte.')
    expect(segments.find((segment) => segment.span?.entry_id === 'chunk')?.text).toBe('Get a latte')
    expect(segments.some((segment) => segment.span?.entry_id === 'word')).toBe(false)
  })

  it('非法越界和空区间不会创建可点击内容', () => {
    const segments = createClickableSegments(
      'Hi',
      [{ start: -1, end: 8, entry_id: 'bad', entry_version: 1, source_locator: 'bad' }],
      []
    )
    expect(segments).toEqual([{ text: 'Hi' }])
  })
})
