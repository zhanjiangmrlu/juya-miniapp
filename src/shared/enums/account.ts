/** 账号注销流程状态 */
export const AccountDeletionStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  REVOKED: 'REVOKED',
  COMPLETED: 'COMPLETED'
} as const

export type AccountDeletionStatus =
  (typeof AccountDeletionStatus)[keyof typeof AccountDeletionStatus] & string
