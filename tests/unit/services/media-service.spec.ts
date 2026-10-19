import { beforeEach, expect, it, vi } from 'vitest'

const ports = vi.hoisted(() => ({ request: vi.fn(), owner: 'learner-one' }))
vi.mock('@/services/api', () => ({
  session: { request: ports.request, userId: () => ports.owner }
}))
vi.mock('@/services/platform', () => ({
  resourceURL: (path: string) => `https://mini.example${path}`
}))

beforeEach(() => {
  vi.resetModules()
  ports.request.mockReset()
  ports.owner = 'learner-one'
})

it('coalesces repeated thumbnail requests and reuses the same unexpired address on list return', async () => {
  ports.request.mockResolvedValue({
    url: '/api/mini/v1/media/one',
    expires_at: new Date(Date.now() + 300000).toISOString()
  })
  const { mediaAddress } = await import('@/services/media-service')
  const [first, second] = await Promise.all([
    mediaAddress('card', 'thumb', 'v1'),
    mediaAddress('card', 'thumb', 'v1')
  ])
  expect(first).toBe(second)
  expect(await mediaAddress('card', 'thumb', 'v1')).toBe(first)
  expect(ports.request).toHaveBeenCalledTimes(1)
})

it('renews failed images and isolates versions, history purposes and accounts', async () => {
  ports.request.mockResolvedValue({
    url: '/api/mini/v1/media/one',
    expires_at: new Date(Date.now() + 300000).toISOString()
  })
  const { mediaAddress } = await import('@/services/media-service')
  await mediaAddress('card', 'thumb', 'v1')
  await mediaAddress('card', 'thumb', 'v1', false, true)
  await mediaAddress('card', 'thumb', 'v2')
  await mediaAddress('card', 'thumb', 'v2', true)
  ports.owner = 'learner-two'
  await mediaAddress('card', 'thumb', 'v2')
  expect(ports.request).toHaveBeenCalledTimes(5)
})

it('does not reuse expired or failed resource responses', async () => {
  ports.request.mockRejectedValueOnce(new Error('network'))
  ports.request.mockResolvedValue({
    url: '/api/mini/v1/media/one',
    expires_at: new Date(Date.now() - 1).toISOString()
  })
  const { mediaAddress } = await import('@/services/media-service')
  await expect(mediaAddress('card', 'thumb', 'v1')).rejects.toThrow('network')
  await mediaAddress('card', 'thumb', 'v1')
  await mediaAddress('card', 'thumb', 'v1')
  expect(ports.request).toHaveBeenCalledTimes(3)
})
