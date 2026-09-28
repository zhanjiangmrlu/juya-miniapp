import { describe, expect, it, vi } from 'vitest'

import type { MessageItem } from '@/shared/contracts/messages'

import { openMessage, resolveMessageRoute } from './message-router'

const message: MessageItem = {
  created_at: '2026-09-28T08:30:00Z',
  id: 'message-1',
  read_at: null,
  related_id: 'feedback-1',
  related_type: 'FEEDBACK',
  summary: '你的问题已有处理结果',
  title: '反馈处理结果',
  type: 'SYSTEM'
}

describe('message router', () => {
  it('maps supported related objects and falls back for unknown links', () => {
    expect(resolveMessageRoute(message)).toBe('/pages/feedback/detail?id=feedback-1')
    expect(
      resolveMessageRoute({ ...message, related_id: 'limited-1', related_type: 'ENTITLEMENT' })
    ).toBe('/pages/entitlement/index?id=limited-1')
    expect(resolveMessageRoute({ ...message, related_type: 'UNKNOWN' })).toBe(
      '/pages/feedback/messages'
    )
  })

  it('marks a message read before navigating to its related object', async () => {
    const order: string[] = []
    const markRead = vi.fn(async () => {
      order.push('read')
    })
    const navigate = vi.fn(async () => {
      order.push('navigate')
    })

    await openMessage(message, markRead, navigate)

    expect(order).toEqual(['read', 'navigate'])
    expect(navigate).toHaveBeenCalledWith('/pages/feedback/detail?id=feedback-1')
  })
})
