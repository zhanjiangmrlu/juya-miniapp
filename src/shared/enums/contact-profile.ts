/** 联系资料更正审核状态 */
export const ContactCorrectionStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED'
} as const

export type ContactCorrectionStatus =
  (typeof ContactCorrectionStatus)[keyof typeof ContactCorrectionStatus] & string

/** 联系资料更正表单字段 */
export const ContactCorrectionField = {
  WECHAT: 'wechat',
  REASON: 'reason'
} as const

export type ContactCorrectionField =
  (typeof ContactCorrectionField)[keyof typeof ContactCorrectionField] & string

/** 联系资料展示状态 */
export const ContactStatus = {
  NOT_PROVIDED: 'NOT_PROVIDED',
  PENDING: 'PENDING',
  CONTACTED: 'CONTACTED',
  UNREACHABLE: 'UNREACHABLE',
  DO_NOT_CONTACT: 'DO_NOT_CONTACT'
} as const

export type ContactStatus = (typeof ContactStatus)[keyof typeof ContactStatus] & string
