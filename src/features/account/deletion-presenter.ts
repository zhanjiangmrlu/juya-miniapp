import type { DeletionRequest } from '@/shared/contracts/account'
import type { ServerClock } from '@/shared/utils/server-clock'

export interface DeletionViewModel {
  canRevoke: boolean
  effectiveAt: string
  effectiveLabel: string
  remainingMs: number
  status: DeletionRequest['status']
}

/** 将服务端注销绝对时间转换为北京时间文案，不在客户端重新计算七天期限。 */
export function presentDeletionState(dto: DeletionRequest, clock: ServerClock): DeletionViewModel {
  return {
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

/** 判断冷启动是否应优先进入注销状态页，阻止继续普通学习流程。 */
export function shouldGateStartupForDeletion(
  deletion?: { effective_at: string; status: string } | null
): boolean {
  return deletion?.status === 'PENDING' || deletion?.status === 'PROCESSING'
}
