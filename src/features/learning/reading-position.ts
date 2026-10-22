import type { ReadingBlock, ReadingPosition } from '@/shared/types/learning'

/** 把当前视口换算为可信正文块及块内进度
 * @param blocks 当前版本已经测量的正文块
 * @param scrollTop 当前页面实际滚动距离
 * @param headerHeight 顶部导航遮挡的逻辑像素高度
 * @param versionId 当前不可变发布版本
 */
export const readingPositionAt = (
  blocks: ReadingBlock[],
  scrollTop: number,
  headerHeight: number,
  versionId: string
): ReadingPosition | null => {
  const ordered = [...blocks].filter((block) => block.height > 0).sort((a, b) => a.top - b.top)
  if (!ordered.length) return null
  const cursor = Math.max(0, scrollTop) + headerHeight
  const block = ordered.filter((value) => value.top <= cursor).at(-1) || ordered[0]!
  return {
    version_id: versionId,
    anchor: block.anchor,
    progress:
      Math.round(Math.max(0, Math.min(1, (cursor - block.top) / block.height)) * 1000) / 1000
  }
}
/** 仅在同一发布版本恢复语义位置，不猜测旧版正文
 * @param position 服务端确认保存的正文锚点
 * @param blocks 当前设备重新布局后的正文块
 * @param headerHeight 当前设备导航遮挡高度
 * @param versionId 当前不可变发布版本
 */
export const restoreReadingOffset = (
  position: ReadingPosition,
  blocks: ReadingBlock[],
  headerHeight: number,
  versionId: string
): number | null => {
  if (position.version_id !== versionId) return null
  const block = blocks.find((value) => value.anchor === position.anchor && value.height > 0)
  if (!block) return null
  if (position.anchor === 'top' && position.progress === 0) return 0
  return Math.max(
    0,
    block.top + block.height * Math.max(0, Math.min(1, position.progress)) - headerHeight
  )
}
