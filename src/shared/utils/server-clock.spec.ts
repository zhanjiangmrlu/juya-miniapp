import { describe, expect, it, vi } from 'vitest'

import { createServerClock } from './server-clock'

describe('createServerClock', () => {
  it('使用服务端与客户端采样偏移计算当前时间', () => {
    vi.useFakeTimers()
    const clientNow = new Date('2026-09-28T00:00:00Z')
    const clock = createServerClock(new Date('2026-09-28T00:05:00Z'), clientNow)
    vi.setSystemTime(new Date('2026-09-28T01:00:00Z'))

    expect(clock.now().toISOString()).toBe('2026-09-28T01:05:00.000Z')
    vi.useRealTimers()
  })
})
