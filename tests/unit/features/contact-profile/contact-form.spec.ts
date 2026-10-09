import { describe, expect, it } from 'vitest'

import {
  presentContact,
  validateContactForm,
  validateCorrectionReason
} from '@/features/contact-profile/contact-form'

describe('contact form', () => {
  it.each([
    ['NOT_PROVIDED', '未填写'],
    ['PENDING', '待联系'],
    ['CONTACTED', '已联系'],
    ['UNREACHABLE', '暂无法联系'],
    ['DO_NOT_CONTACT', '不希望联系'],
    ['FUTURE_STATUS', '状态待确认']
  ])('联系状态 %s 显示中文，保留服务端修改能力', (status, label) => {
    expect(
      presentContact({
        can_self_edit: false,
        change_pending: false,
        consent_version: 'v1',
        contact_status: status,
        self_edit_count: 1,
        wechat_id: 'wechat_123'
      })
    ).toMatchObject({ statusLabel: label, canSelfEdit: false, selfEditCount: 1 })
  })

  it('变更待处理文案优先于联系业务状态', () => {
    expect(
      presentContact({
        can_self_edit: false,
        change_pending: true,
        consent_version: 'v1',
        contact_status: 'CONTACTED',
        self_edit_count: 1,
        wechat_id: 'wechat_123'
      })
    ).toMatchObject({ statusLabel: '变更审核中', canSelfEdit: false, selfEditCount: 1 })
  })

  it('未填写时返回明确状态', () => {
    expect(presentContact(null)).toMatchObject({ statusLabel: '未填写，去完善', wechatId: null })
  })

  it('协议未同意时不可提交', () => {
    expect(validateContactForm({ consentConfirmed: false, wechatId: 'wechat_123' })).toEqual({
      error: '请先阅读并同意联系资料使用说明',
      valid: false
    })
  })

  it('相同微信号不在客户端拒绝，修改次数和能力完全展示服务端结果', () => {
    expect(validateContactForm({ consentConfirmed: true, wechatId: 'wechat_123' })).toEqual({
      normalizedWechatId: 'wechat_123',
      valid: true
    })
    expect(
      presentContact({
        can_self_edit: false,
        change_pending: false,
        consent_version: 'v1',
        contact_status: 'VERIFIED',
        self_edit_count: 1,
        wechat_id: 'wechat_123'
      })
    ).toMatchObject({ canSelfEdit: false, selfEditCount: 1 })
  })

  it.each([
    [' a ', { error: '更正原因需为 2 至 500 个字符', valid: false }],
    ['  填写错误  ', { normalizedReason: '填写错误', valid: true }]
  ])('更正原因去除首尾空格后校验：%s', (reason, expected) => {
    expect(validateCorrectionReason(reason)).toEqual(expected)
  })
})
