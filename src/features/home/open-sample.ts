import type { SceneOpenResponse } from '@/shared/contracts/learning'
/** 提取开放场景的试学句，response 为服务端授权响应 */
export const resolveOpenSample = (response: SceneOpenResponse): string | null => {
  if (
    response.authorization_pending ||
    response.access !== 'OPEN' ||
    response.scene?.access !== 'OPEN'
  )
    return null
  return response.scene.entries.find((entry) => entry.entry_type === 'DIALOGUE')?.text ?? null
}
