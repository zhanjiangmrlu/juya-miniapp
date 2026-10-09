import { describe, expect, it } from 'vitest'

import { getSupplementErrorMessage } from '@/features/feedback/feedback-presenter'
import { ApiError } from '@/services/http/errors'

describe('补充反馈失败提示优先级', () => {
  it.each([
    [
      new ApiError('FEEDBACK_CONTENT_BLOCKED', '图片未通过审核', 422),
      '内容未通过检查，请修改后重新提交'
    ],
    [new Error('截图上传失败'), '截图上传失败'],
    [new Error('图片过大'), '图片过大'],
    [new Error('offline'), '补充提交失败，草稿已保留，请重试'],
    ['截图上传失败', '补充提交失败，草稿已保留，请重试']
  ])('按照错误类型给出可重试提示', (error, expected) => {
    expect(getSupplementErrorMessage(error)).toBe(expected)
  })
})
