import { beforeEach, expect, it, vi } from 'vitest'
const ports = vi.hoisted(() => ({
  load: vi.fn(),
  mark: vi.fn(),
  show: vi.fn(),
  restore: vi.fn(),
  current: vi.fn(() => null as string | null),
  notify: vi.fn(() => true)
}))
vi.mock('@/services/privacy', () => ({
  privacy: {
    loadPolicies: ports.load,
    published: () => true,
    shouldNotify: ports.notify,
    markShown: ports.mark,
    restore: ports.restore
  }
}))
vi.mock('@/services/api', () => ({ session: { userId: ports.current } }))
beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  ports.current.mockReturnValue(null)
  ports.load.mockResolvedValue(undefined)
  ports.restore.mockResolvedValue(undefined)
})
it('does not consume or show pending launch when home is no longer visible', async () => {
  let done!: () => void
  ports.load.mockImplementation(
    () =>
      new Promise<void>((r) => {
        done = r
      })
  )
  const c = await import('@/services/consent-coordinator')
  c.prepareConsentLaunch()
  const evaluating = c.considerHomeConsent(ports.show, () => false)
  done()
  await evaluating
  expect(ports.mark).not.toHaveBeenCalled()
  await c.considerHomeConsent(ports.show, () => true)
  expect(ports.mark).toHaveBeenCalledOnce()
  await c.considerHomeConsent(ports.show)
  expect(ports.show).toHaveBeenCalledOnce()
})
it('checks the trusted account confirmation after a slow policy response before deciding notification', async () => {
  ports.current.mockReturnValue('u')
  ports.restore.mockImplementation(async () => {
    ports.notify.mockReturnValue(false)
  })
  const c = await import('@/services/consent-coordinator')
  c.prepareConsentLaunch()
  await c.considerHomeConsent(ports.show)
  expect(ports.restore).toHaveBeenCalledWith('u')
  expect(ports.show).not.toHaveBeenCalled()
})
