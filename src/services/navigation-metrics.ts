import type { CapsuleRect } from '@/shared/types/navigation'

/** 根据状态栏高度、胶囊边界和窗口宽度计算导航尺寸 */
export const resolveNavigationMetrics = (
  statusBarHeight: number | undefined,
  capsule: CapsuleRect | undefined,
  windowWidth: number
) => {
  const valid = capsule && capsule.height > 0 && capsule.width > 0 && capsule.top >= 0
  const top = valid ? (statusBarHeight ?? capsule.top) : statusBarHeight || 30
  return {
    top,
    height: valid ? capsule.height + Math.max(0, capsule.top - top) * 2 : 48,
    right: valid ? windowWidth - capsule.left : 110
  }
}
