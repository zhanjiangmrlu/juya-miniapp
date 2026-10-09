/** 学习进度队列指令类型 */
export const ProgressCommandKind = {
  COMPLETE: 'COMPLETE',
  POSITION: 'POSITION'
} as const

export type ProgressCommandKind = (typeof ProgressCommandKind)[keyof typeof ProgressCommandKind] &
  string
