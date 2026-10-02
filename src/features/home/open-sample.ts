import type { LearningCatalogResponse } from '@/shared/contracts/learning'

/** 提取只读开放试学摘要，catalog 为服务端当前账号的目录投影 */
export const resolveOpenSample = (
  catalog: LearningCatalogResponse
): { text: string; sceneTitle: string } | null => {
  if (catalog.authorization_pending) return null
  const scene = catalog.items.find((item) => item.access === 'OPEN' && item.trial_sentence?.trim())
  const text = scene?.trial_sentence?.trim()
  return scene && text ? { text, sceneTitle: scene.chinese_title } : null
}
