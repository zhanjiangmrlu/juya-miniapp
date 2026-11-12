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
it.each([true, false])(
  'never loads or prompts from the retired home launch path, visible=%s',
  async (visible) => {
    const c = await import('@/services/consent-coordinator')
    c.prepareConsentLaunch()
    await c.considerHomeConsent(ports.show, () => visible)
    await c.considerHomeConsent(ports.show)
    expect(ports.load).not.toHaveBeenCalled()
    expect(ports.mark).not.toHaveBeenCalled()
    expect(ports.show).not.toHaveBeenCalled()
  }
)
