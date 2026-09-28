export interface ServerClock {
  now(): Date
  remainingUntil(value: string): number
}

/** 基于一次服务端采样建立时间偏移，后续不依赖用户设备时钟是否准确。 */
export function createServerClock(serverNow: Date, clientNow = new Date()): ServerClock {
  const offset = serverNow.getTime() - clientNow.getTime()

  return {
    /** 返回应用当前估算的服务端时间。 */
    now: () => new Date(Date.now() + offset),
    /** 计算距离服务端绝对时刻的剩余毫秒，已过期时返回 0。 */
    remainingUntil: (value) => Math.max(0, new Date(value).getTime() - (Date.now() + offset))
  }
}
