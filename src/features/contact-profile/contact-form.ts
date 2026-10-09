import {
  CONTACT_STATUS_LABELS as contactStatusLabels,
  CORRECTION_REASON_MAX_LENGTH,
  CORRECTION_REASON_MIN_LENGTH
} from '@/shared/constants/contact-profile'

import type { ContactProfile } from '@/shared/contracts/profile'
import type {
  ContactFormInput,
  ContactViewModel,
  CorrectionValidationResult,
  ValidationResult
} from '@/shared/types/contact-profile'

export type { ValidationResult } from '@/shared/types/contact-profile'
export type { CorrectionValidationResult } from '@/shared/types/contact-profile'
export type { ContactViewModel } from '@/shared/types/contact-profile'

/** 校验微信号与协议确认；相同值和修改次数不在客户端推导。 */
export function validateContactForm(input: ContactFormInput): ValidationResult {
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
  if (
    normalizedReason.length < CORRECTION_REASON_MIN_LENGTH ||
    normalizedReason.length > CORRECTION_REASON_MAX_LENGTH
  ) {
    return { error: '更正原因需为 2 至 500 个字符', valid: false }
  }
  return { normalizedReason, valid: true }
}

/** 从服务端联系资料生成中文状态，contact 为空时提供完善入口，修改能力仍沿用服务端结果 */
export const presentContact = (contact: ContactProfile | null): ContactViewModel => {
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
    statusLabel: contact.change_pending
      ? '变更审核中'
      : contactStatusLabels[contact.contact_status] || '状态待确认',
    wechatId: contact.wechat_id
  }
}
