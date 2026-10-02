import type { DeletionRequest } from '@/shared/contracts/account'
import type { ServerClock } from '@/shared/utils/server-clock'

export interface DeletionViewModel {
  canRevoke: boolean
  effectiveAt: string
  effectiveLabel: string
  remainingMs: number
  status: DeletionRequest['status']
}

/** 展示注销状态，dto 为服务端注销记录，clock 为剩余时间展示用采样时钟 */
export const presentDeletionState = (
  dto: DeletionRequest,
  clock: ServerClock
): DeletionViewModel => {
  return {
    // 未提供可靠服务端采样时不能用设备时间隐藏撤回，真实期限由撤回接口判定
    canRevoke: dto.status === 'PENDING',
    effectiveAt: dto.effective_at,
    effectiveLabel: new Intl.DateTimeFormat('zh-CN', {
      day: '2-digit',
      hour: '2-digit',
      hour12: false,
      minute: '2-digit',
      month: '2-digit',
      timeZone: 'Asia/Shanghai',
      year: 'numeric'
    }).format(new Date(dto.effective_at)),
    remainingMs: clock.remainingUntil(dto.effective_at),
    status: dto.status
  }
}

/** 判断冷启动注销门禁，deletion 为本人资料提供的最新注销状态摘要 */
export const shouldGateStartupForDeletion = (
  deletion?: { effective_at: string; status: string } | null
): boolean => {
  return deletion?.status === 'PENDING' || deletion?.status === 'PROCESSING'
}
