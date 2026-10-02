import { describe, expect, it } from 'vitest'

import { composeCorrectionReason } from './correction-reason'
describe('联系资料更正申请正文', () => {
  it('保留新号与原原因并限制最终提交总长度', () => {
    expect(composeCorrectionReason('new_wechat', ' 原号填写错误 ')).toEqual({
      valid: true,
      normalizedReason: '新微信号：new_wechat\n更正原因：原号填写错误'
    })
    expect(composeCorrectionReason('new_wechat', '字'.repeat(500)).valid).toBe(false)
  })
  it('组合提示前缀不能让空白原因通过校验', () => {
    expect(composeCorrectionReason('new_wechat', '  ').valid).toBe(false)
  })
})
