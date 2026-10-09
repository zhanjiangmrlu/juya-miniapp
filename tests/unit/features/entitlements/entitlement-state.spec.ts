import { describe, expect, it } from 'vitest'

import { presentEntitlements } from '@/features/entitlements/entitlement-presenter'

import type { LimitedEntitlement } from '@/shared/contracts/entitlements'
const clock = {
  now: () => new Date('2026-10-02T00:00:00Z'),
  remainingUntil: (value: string) =>
    Math.max(0, Date.parse(value) - Date.parse('2026-10-02T00:00:00Z'))
}
describe('限时权益访问约束', () => {
  it('正式权益在生效前和到期后都不提供正文访问', () => {
    const formal = [
      {
        id: 'future',
        content_pack_id: 'p',
        title: '尚未生效',
        status: 'ACTIVE',
        effective_at: '2026-10-03T00:00:00Z',
        expires_at: null
      },
      {
        id: 'expired',
        content_pack_id: 'p',
        title: '已到期',
        status: 'ACTIVE',
        effective_at: '2026-09-01T00:00:00Z',
        expires_at: '2026-10-01T00:00:00Z'
      }
    ]
    expect(
      presentEntitlements(
        { authorization_pending: false, formal, limited: [], version: 'v1' },
        clock
      ).formal.every((item) => !item.canOpenContent)
    ).toBe(true)
  })
  it.each(['PAUSED', 'REVOKED', 'START_EXPIRED'])(
    '服务端 %s 不因未来结束时间放宽正文访问',
    (status) => {
      const item: LimitedEntitlement = {
        id: 'one',
        activity_id: 'activity',
        title: '活动',
        duration_days: 3,
        scene_count: 3,
        status,
        activated_at: '2026-10-01T00:00:00Z',
        expires_at: '2026-10-04T00:00:00Z',
        starts_before: '2026-10-03T00:00:00Z'
      }
      const view = presentEntitlements(
        { authorization_pending: false, formal: [], limited: [item], version: '1' },
        clock
      ).limited[0]
      expect(view).toMatchObject({ state: 'EXCEPTION', canOpenContent: false })
      expect(view?.activatedAt).toBe(item.activated_at)
      expect(view?.expiresAt).toBe(item.expires_at)
    }
  )
})
