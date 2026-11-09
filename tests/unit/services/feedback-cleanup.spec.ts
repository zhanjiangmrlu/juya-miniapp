import { expect, it, vi } from 'vitest'
const state = vi.hoisted(() => ({ owner: 'A' as string | null, expired: () => undefined as void }))
vi.mock('@/services/api', () => ({
  session: { userId: () => state.owner, request: vi.fn() },
  operations: { pending: () => false },
  onSessionExpired: (cb: () => void) => {
    state.expired = cb
    return () => undefined
  }
}))
vi.mock('@/services/platform', () => ({ operationKey: () => 'isolated-key-long-enough' }))
import { clearFeedbackDrafts, registerFeedbackCleanup } from '@/services/feedback-service'
import { feedbackDraft } from '@/sub-packages/feedback/feedback-draft-service'

it('deduplicates cleanup hooks and supports unloading their owning feature', () => {
  const clear = vi.fn()
  const unregister = registerFeedbackCleanup(clear)
  registerFeedbackCleanup(clear)
  clearFeedbackDrafts()
  expect(clear).toHaveBeenCalledTimes(1)
  unregister()
  clearFeedbackDrafts()
  expect(clear).toHaveBeenCalledTimes(1)
})
it('destroys old input and retires its editor through A to guest to A or B', () => {
  state.owner = 'A'
  const a = feedbackDraft()
  a.updateText('private old input')
  state.owner = null
  state.expired()
  expect(a.text.value).toBe('')
  state.owner = 'A'
  a.updateText('late input')
  expect(a.active.value).toBe(false)
  expect(a.text.value).toBe('')
  expect(feedbackDraft()).not.toBe(a)
  clearFeedbackDrafts()
  state.owner = 'B'
  expect(feedbackDraft().text.value).toBe('')
})
