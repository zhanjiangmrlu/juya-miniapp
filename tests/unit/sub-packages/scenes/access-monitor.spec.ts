import { expect, it, vi } from 'vitest'

import { createAccessMonitor } from '@/sub-packages/scenes/access-monitor'

it('expires using server relative time and discards old in-flight permissions after suspension', async () => {
  vi.useFakeTimers()
  const apply = vi.fn(),
    fail = vi.fn()
  let resolve!: (value: {
    access: {
      server_now: string
      expires_at: string | null
      can_learn: boolean
      can_lookup: boolean
      is_free: boolean
      reason: string | null
      version: string
    }
  }) => void
  const current = {
    access: {
      server_now: '2026-10-25T15:59:59Z',
      expires_at: '2026-10-25T16:00:00Z',
      can_learn: true,
      can_lookup: true,
      is_free: false,
      reason: null,
      version: '1'
    }
  }
  const request = vi
    .fn()
    .mockResolvedValueOnce(current)
    .mockResolvedValueOnce({
      ...current,
      access: { ...current.access, can_learn: false, can_lookup: false, version: '2' }
    })
    .mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done
        })
    )
  const monitor = createAccessMonitor(request, apply, fail)
  await monitor.refresh()
  await vi.advanceTimersByTimeAsync(1001)
  expect(apply.mock.calls.at(-1)?.[0].access.can_learn).toBe(false)
  const pending = monitor.refresh()
  monitor.suspend()
  resolve(current)
  expect(await pending).toBe(false)
  expect(apply).toHaveBeenCalledTimes(2)
  monitor.dispose()
  vi.useRealTimers()
})

it('does not grant permission after a failed refresh and allows explicit recovery', async () => {
  const failure = new Error('权限暂未获取，请重试'),
    apply = vi.fn(),
    fail = vi.fn()
  const monitor = createAccessMonitor(vi.fn().mockRejectedValue(failure), apply, fail)
  expect(await monitor.refresh()).toBe(false)
  expect(apply).not.toHaveBeenCalled()
  expect(fail).toHaveBeenCalledWith(failure)
  monitor.dispose()
})
