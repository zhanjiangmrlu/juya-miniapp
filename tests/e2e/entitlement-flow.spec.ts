import { describe, expect, it } from 'vitest'

import { presentEntitlements } from '@/features/entitlements/entitlement-presenter'
import { createServerClock } from '@/shared/utils/server-clock'

import type { EntitlementsResponse } from '@/shared/contracts/entitlements'
import type { SceneOpenResponse } from '@/shared/contracts/learning'

import { createE2eClient } from './mock-client'

describe('entitlement flow e2e', () => {
  it('keeps formal and limited projections separate and never activates locally', async () => {
    const client = createE2eClient()
    const before = await client.get<EntitlementsResponse>('/api/v1/me/entitlements')
    const view = presentEntitlements(before, createServerClock(new Date('2026-09-28T08:30:00Z')))

    expect(view.formal.some((item) => item.canOpenContent)).toBe(true)
    expect(view.limited[0]?.state).toBe('PENDING')
    await client.post<SceneOpenResponse>('/api/v1/scenes/scene-castle/open')

    const after = await client.get<EntitlementsResponse>('/api/v1/me/entitlements')
    expect(after.limited[0]?.activated_at).toBeNull()
    expect(after.limited[0]?.expires_at).toBeNull()
  })
})
