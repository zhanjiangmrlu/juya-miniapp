import { describe, expect, it } from 'vitest'

import {
  canSupplementFeedback,
  getResolutionActions,
  preserveDraftAfterUploadFailure,
  validateFeedbackDraft,
  validateSupplement
} from '@/features/feedback/feedback-form'

import type { FeedbackItem } from '@/shared/contracts/feedback'

const baseDraft = {
  category: 'CONTENT',
  description: ' 第二句的中文释义似乎不准确。 ',
  screenshots: []
}

/** 构造反馈详情，便于验证状态相关的补充与重开约束 */
const createFeedback = (overrides: Partial<FeedbackItem> = {}): FeedbackItem => {
  return {
    category: 'CONTENT',
    created_at: '2026-09-28T08:30:00Z',
    description: '示例问题',
    id: 'feedback-1',
    reply: null,
    screenshots: [],
    status: 'PENDING',
    ...overrides
  }
}

describe('feedback form', () => {
  it('未来处理时间不开放重开且七天后不开放重开', () => {
    const now = new Date('2026-10-02T08:00:00Z')
    expect(
      getResolutionActions(
        createFeedback({ status: 'RESOLVED', resolved_at: '2026-10-03T08:00:00Z' }),
        now
      ).canReopen
    ).toBe(false)
    expect(
      getResolutionActions(
        createFeedback({ status: 'RESOLVED', resolved_at: '2026-09-24T08:00:00Z' }),
        now
      ).canReopen
    ).toBe(false)
    expect(
      getResolutionActions(
        createFeedback({ status: 'RESOLVED', resolved_at: '2026-09-24T08:00:00Z' }),
        now
      ).showResolvedAction
    ).toBe(false)
  })
  it('validates trimmed 1-300 character descriptions and required categories', () => {
    expect(validateFeedbackDraft(baseDraft)).toMatchObject({
      normalized: { category: 'CONTENT', description: '第二句的中文释义似乎不准确。' },
      valid: true
    })
    expect(validateFeedbackDraft({ ...baseDraft, category: '' }).errors.category).toBeTruthy()
    expect(
      validateFeedbackDraft({ ...baseDraft, description: '   ' }).errors.description
    ).toBeTruthy()
    expect(
      validateFeedbackDraft({ ...baseDraft, description: '句'.repeat(301) }).errors.description
    ).toBeTruthy()
  })

  it('allows one supported image up to 5 MiB', () => {
    const validScreenshot = { mimeType: 'image/png', path: '/tmp/one.png', size: 5 * 1024 * 1024 }
    expect(validateFeedbackDraft({ ...baseDraft, screenshots: [validScreenshot] }).valid).toBe(true)
    expect(
      validateFeedbackDraft({ ...baseDraft, screenshots: [validScreenshot, validScreenshot] })
        .errors.screenshot
    ).toBeTruthy()
    expect(
      validateFeedbackDraft({
        ...baseDraft,
        screenshots: [{ ...validScreenshot, mimeType: 'image/gif' }]
      }).errors.screenshot
    ).toBeTruthy()
    expect(
      validateFeedbackDraft({
        ...baseDraft,
        screenshots: [{ ...validScreenshot, size: 5 * 1024 * 1024 + 1 }]
      }).errors.screenshot
    ).toBeTruthy()
  })

  it('上传失败保留截图与文字草稿以支持直接重试', () => {
    const draft = {
      ...baseDraft,
      screenshots: [{ mimeType: 'image/jpeg', path: '/tmp/failed.jpg', size: 1024 }]
    }
    expect(preserveDraftAfterUploadFailure(draft)).toEqual(draft)
  })

  it('only accepts 1-300 character supplements after an admin reply', () => {
    expect(validateSupplement(' 补充：仅第三句无法播放。 ')).toEqual({
      normalized: '补充：仅第三句无法播放。',
      valid: true
    })
    expect(validateSupplement(' '.repeat(3)).valid).toBe(false)
    expect(validateSupplement('补'.repeat(301)).valid).toBe(false)
    expect(
      canSupplementFeedback(
        createFeedback({ reply: '请提供出现问题的句子。', status: 'NEEDS_SUPPLEMENT' })
      )
    ).toBe(true)
    expect(canSupplementFeedback(createFeedback({ status: 'NEEDS_SUPPLEMENT' }))).toBe(false)
  })

  it('offers compact two-line reopen copy only once within seven days', () => {
    const now = new Date('2026-09-30T08:30:00Z')
    expect(
      getResolutionActions(
        createFeedback({
          resolved_at: '2026-09-28T08:30:00Z',
          reopen_count: 0,
          status: 'RESOLVED'
        }),
        now
      )
    ).toEqual({
      canReopen: true,
      reopenPrimaryLabel: '仍有问题',
      reopenSecondaryLabel: '（可重开一次）',
      showResolvedAction: true
    })
    expect(
      getResolutionActions(
        createFeedback({
          resolved_at: '2026-09-28T08:30:00Z',
          reopen_count: 1,
          status: 'RESOLVED'
        }),
        now
      ).canReopen
    ).toBe(false)
  })
})
