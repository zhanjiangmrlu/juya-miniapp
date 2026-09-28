import type { ContactProfile } from '@/shared/contracts/profile'

export type ValidationResult =
  { error: string; valid: false } | { normalizedWechatId: string; valid: true }

export type CorrectionValidationResult =
  { error: string; valid: false } | { normalizedReason: string; valid: true }

export interface ContactViewModel {
  canSelfEdit: boolean
  selfEditCount: number
  statusLabel: string
  wechatId: string | null
}

/** 校验微信号与协议确认；相同值和修改次数不在客户端推导。 */
export function validateContactForm(input: {
  consentConfirmed: boolean
  wechatId: string
}): ValidationResult {
  if (!input.consentConfirmed) {
    return { error: '请先阅读并同意联系资料使用说明', valid: false }
  }

  const normalizedWechatId = input.wechatId.trim().toLocaleLowerCase('en-US')
  if (!/^[a-z][a-z0-9_-]{5,19}$/.test(normalizedWechatId)) {
    return { error: '请输入 6 至 20 位有效微信号', valid: false }
  }

  return { normalizedWechatId, valid: true }
}

/** 校验更正原因，按去除首尾空格后的 2 至 500 字符计算。 */
export function validateCorrectionReason(reason: string): CorrectionValidationResult {
  const normalizedReason = reason.trim()
  if (normalizedReason.length < 2 || normalizedReason.length > 500) {
    return { error: '更正原因需为 2 至 500 个字符', valid: false }
  }
  return { normalizedReason, valid: true }
}

/** 使用服务端联系方式事实生成页面模型，未填写时提供统一完善入口。 */
export function presentContact(contact: ContactProfile | null): ContactViewModel {
  if (!contact) {
    return {
      canSelfEdit: true,
      selfEditCount: 0,
      statusLabel: '未填写，去完善',
      wechatId: null
    }
  }

  return {
    canSelfEdit: contact.can_self_edit,
    selfEditCount: contact.self_edit_count,
    statusLabel: contact.change_pending ? '变更审核中' : contact.contact_status,
    wechatId: contact.wechat_id
  }
}
