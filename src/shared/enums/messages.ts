/** 前端已识别的消息关联业务 */
export const MessageRelatedType = {
  FEEDBACK: 'FEEDBACK',
  ENTITLEMENT: 'ENTITLEMENT'
} as const

export type MessageRelatedType = (typeof MessageRelatedType)[keyof typeof MessageRelatedType] &
  string
