/** 场景内容模型判别类型 */
export const SceneModelKind = {
  FULL: 'FULL',
  PREVIEW: 'PREVIEW',
  DENIED: 'DENIED'
} as const

export type SceneModelKind = (typeof SceneModelKind)[keyof typeof SceneModelKind] & string
