/** 场景内容模型判别类型 */
export const SceneModelKind = {
  FULL: 'FULL',
  PREVIEW: 'PREVIEW',
  DENIED: 'DENIED'
} as const

export type SceneModelKind = (typeof SceneModelKind)[keyof typeof SceneModelKind] & string
/** 词汇图片取址状态 */
export const WordImageStatus = { LOADING: 'LOADING', READY: 'READY', FAILED: 'FAILED' } as const
export type WordImageStatus = (typeof WordImageStatus)[keyof typeof WordImageStatus] & string
