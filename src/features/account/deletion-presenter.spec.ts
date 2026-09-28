import { describe, expect, it } from 'vitest'

import { createServerClock } from '@/shared/utils/server-clock'

import { presentDeletionState, shouldGateStartupForDeletion } from './deletion-presenter'

const pending = {
  completed_at: null,
  effective_at: '2026-10-05T08:30:00Z',
  id: 'deletion-1',
  requested_at: '2026-09-28T08:30:00Z',
  revoked_at: null,
  status: 'PENDING' as const
}

describe('deletion presenter', () => {
  it('shows the exact absolute effective time supplied by the server', () => {
    const clock = createServerClock(
      new Date('2026-09-28T08:30:00Z'),
      new Date('2026-09-28T08:29:58Z')
    )
    const view = presentDeletionState(pending, clock)

    expect(view.effectiveAt).toBe('2026-10-05T08:30:00Z')
    expect(view.effectiveLabel).toContain('2026')
    expect(view.canRevoke).toBe(true)
  })

  it('prioritizes the pending deletion page during startup', () => {
    expect(
      shouldGateStartupForDeletion({ effective_at: pending.effective_at, status: 'PENDING' })
    ).toBe(true)
    expect(
      shouldGateStartupForDeletion({ effective_at: pending.effective_at, status: 'PROCESSING' })
    ).toBe(true)
    expect(
      shouldGateStartupForDeletion({ effective_at: pending.effective_at, status: 'REVOKED' })
    ).toBe(false)
  })

  it('stops showing revoke after the request is revoked or completed', () => {
    expect(
      presentDeletionState({ ...pending, status: 'REVOKED' }, createServerClock()).canRevoke
    ).toBe(false)
    expect(
      presentDeletionState({ ...pending, status: 'COMPLETED' }, createServerClock()).canRevoke
    ).toBe(false)
  })
})
