import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createServerClock } from '@/shared/utils/server-clock'

import type { EntitlementsResponse, LimitedEntitlement } from '@/shared/contracts/entitlements'

import { presentEntitlements } from './entitlement-presenter'

const clock = createServerClock(new Date('2026-09-28T08:00:00Z'), new Date('2026-09-28T08:00:00Z'))

/** 创建限时权益测试数据。 */
function limited(overrides: Partial<LimitedEntitlement> = {}): LimitedEntitlement {
  return {
    activated_at: null,
    activity_id: 'activity-1',
    duration_days: 3,
    expires_at: null,
    id: 'limited-1',
    scene_count: 3,
    starts_before: '2026-10-01T08:00:00Z',
    status: 'PENDING',
    title: '3 天限时学习',
    ...overrides
  }
}

/** 创建权益聚合响应。 */
function response(limitedItems: LimitedEntitlement[]): EntitlementsResponse {
  return { authorization_pending: false, formal: [], limited: limitedItems, version: 'v1' }
}

describe('presentEntitlements', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T08:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })
  it('待开始状态不在客户端生成激活和到期时间', () => {
    const result = presentEntitlements(response([limited()]), clock)
    expect(result.limited[0]).toMatchObject({
      activatedAt: null,
      expiresAt: null,
      state: 'PENDING'
    })
  })

  it.each([
    [3, '2026-09-28T09:00:00Z', '2026-10-01T09:00:00Z'],
    [5, '2026-09-28T09:00:00Z', '2026-10-03T09:00:00Z']
  ] as const)('%s 天权益直接使用首次 open 返回的服务端时间', (days, activatedAt, expiresAt) => {
    const result = presentEntitlements(
      response([
        limited({
          activated_at: activatedAt,
          duration_days: days,
          expires_at: expiresAt,
          status: 'ACTIVE'
        })
      ]),
      clock
    )
    expect(result.limited[0]).toMatchObject({ activatedAt, expiresAt })
  })

  it('正式与限时权益并存，限时不足一天标记即将结束并显示绝对时间', () => {
    const dto: EntitlementsResponse = {
      authorization_pending: false,
      formal: [
        {
          content_pack_id: 'pack-1',
          effective_at: '2026-09-01T00:00:00Z',
          expires_at: null,
          id: 'formal-1',
          status: 'ACTIVE',
          title: '正式内容包'
        }
      ],
      limited: [
        limited({
          activated_at: '2026-09-25T09:00:00Z',
          expires_at: '2026-09-28T20:00:00Z',
          status: 'ACTIVE'
        })
      ],
      version: 'v1'
    }
    const result = presentEntitlements(dto, clock)

    expect(result.formal).toHaveLength(1)
    expect(result.limited[0]).toMatchObject({ expiresAt: '2026-09-28T20:00:00Z', state: 'ENDING' })
  })

  it('结束后保留成果和收藏入口，授权待确认时不扩大访问', () => {
    const ended = presentEntitlements(
      response([
        limited({
          activated_at: '2026-09-20T00:00:00Z',
          expires_at: '2026-09-23T00:00:00Z',
          status: 'ENDED'
        })
      ]),
      clock
    )
    const pending = presentEntitlements(
      { ...response([limited()]), authorization_pending: true },
      clock
    )

    expect(ended.limited[0]).toMatchObject({ canOpenContent: false, keepResults: true })
    expect(pending.authorizationPending).toBe(true)
    expect(pending.limited.every((item) => !item.canOpenContent)).toBe(true)
  })
})
