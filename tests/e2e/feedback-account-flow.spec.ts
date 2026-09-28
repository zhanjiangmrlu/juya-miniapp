import { describe, expect, it } from 'vitest'

import type { DeletionRequest } from '@/shared/contracts/account'
import type { FeedbackItem } from '@/shared/contracts/feedback'
import type { MessageItem, MessagePage } from '@/shared/contracts/messages'

import { createE2eClient } from './mock-client'

describe('feedback and account e2e', () => {
  it('submits feedback, reads its message, resolves it, then requests and revokes deletion', async () => {
    const client = createE2eClient()
    const created = await client.post<FeedbackItem>('/api/v1/feedback', {
      category: 'DISPLAY',
      description: '平板横屏时标题显示不完整。',
      screenshots: []
    })
    expect(created.category).toBe('DISPLAY')
    expect(created.description).toBe('平板横屏时标题显示不完整。')

    const messages = await client.get<MessagePage>('/api/v1/messages')
    const message = messages.items[0] as MessageItem
    const read = await client.post<MessageItem>(`/api/v1/messages/${message.id}/read`)
    expect(read.read_at).toBeTruthy()

    const resolved = await client.post<FeedbackItem>(`/api/v1/feedback/${created.id}/resolution`, {
      action: 'RESOLVED'
    })
    expect(resolved.status).toBe('RESOLVED')

    await client.delete('/api/v1/me/learning-data', {
      confirmation: 'CLEAR_LEARNING_DATA'
    })
    const deletion = await client.post<DeletionRequest>('/api/v1/me/deletion')
    expect(Date.parse(deletion.effective_at) - Date.parse(deletion.requested_at)).toBe(
      7 * 24 * 60 * 60 * 1000
    )
    const revoked = await client.post<DeletionRequest>('/api/v1/me/deletion/revoke')
    expect(revoked.status).toBe('REVOKED')
  })
})
