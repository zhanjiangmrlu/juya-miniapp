import { describe, expect, it, vi } from 'vitest'

import { loadAllMessages } from '@/features/messages/load-messages'

import type { MessageItem } from '@/shared/contracts/messages'
describe('本人完整消息列表', () => {
  it('遍历分页并合并重复记录，不遗漏后续反馈红点', async () => {
    const first = { id: 'one', related_type: 'FEEDBACK', read_at: null } as MessageItem
    const second = { ...first, id: 'two' }
    const list = vi
      .fn()
      .mockResolvedValueOnce({ items: [first], next_cursor: 'next', has_more: true })
      .mockResolvedValueOnce({ items: [first, second], next_cursor: null, has_more: false })
    expect(await loadAllMessages({ list, markRead: vi.fn() })).toEqual([first, second])
    expect(list).toHaveBeenLastCalledWith('next')
  })
})
