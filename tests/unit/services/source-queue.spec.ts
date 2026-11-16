import { beforeEach, expect, it, vi } from 'vitest'

const ports = vi.hoisted(() => ({
  owner: 'owner',
  request: vi.fn(),
  stored: new Map<string, unknown>()
}))
vi.mock('@/services/api', async () => {
  const { createOperationService } = await import('@/services/operation-service')
  const session = { request: ports.request, identity: () => ports.owner, userId: () => ports.owner }
  return {
    session,
    operations: createOperationService({
      session,
      key: () => 'stable-queue-operation-key',
      storage: {
        get: (key) => ports.stored.get(key),
        set: (key, value) => {
          ports.stored.set(key, value)
        },
        remove: (key) => {
          ports.stored.delete(key)
        }
      }
    }),
    onSessionExpired: () => () => undefined
  }
})
import { ApiError } from '@/services/errors'
import { openSourceScene, sourceQueue } from '@/services/source-queue'

beforeEach(() => {
  vi.clearAllMocks()
  ports.owner = 'owner'
  ports.stored.clear()
  sourceQueue.clear()
  vi.stubGlobal('uni', {
    navigateTo: vi.fn(({ success }) => success?.({ errMsg: 'ok' })),
    showToast: vi.fn()
  })
})

it('queries an unknown snapshot creation result before retrying, and enters only the confirmed source', async () => {
  const queue = { id: 'q', source: 'favorites', total: 4 }
  ports.request
    .mockRejectedValueOnce(new ApiError('network_unknown', 'response unknown'))
    .mockResolvedValueOnce({ status: 'succeeded', result: queue })
  await expect(openSourceScene('favorites', 'card')).rejects.toThrow('response unknown')
  expect(uni.navigateTo).not.toHaveBeenCalled()
  await openSourceScene('favorites', 'card')
  expect(ports.request.mock.calls.map((call) => call[0])).toEqual([
    '/api/mini/v1/learning-queues',
    '/api/mini/v1/operations/stable-queue-operation-key'
  ])
  expect(sourceQueue.matches('q', 'card')).toBe(true)
  expect(uni.navigateTo).toHaveBeenCalledWith(
    expect.objectContaining({ url: '/sub-packages/scenes/detail?id=card&queue=q' })
  )
})

it('waits for native entry completion, coalesces repeated clicks, and reports a failed entry while restoring its previous source', async () => {
  const previous = { id: 'previous', source: 'records' as const, total: 1 }
  sourceQueue.attach(previous, 'old-card')
  ports.request.mockResolvedValue({ id: 'q', source: 'favorites', total: 4 })
  let fail: () => void = () => undefined
  vi.mocked(uni.navigateTo).mockImplementation((options) => {
    fail = () => options!.fail?.({ errMsg: 'stack full' })
    return undefined as never
  })
  const first = openSourceScene('favorites', 'card')
  await Promise.resolve()
  await Promise.resolve()
  await openSourceScene('favorites', 'card')
  expect(ports.request).toHaveBeenCalledTimes(1)
  fail()
  await expect(first).rejects.toThrow('场景暂未打开')
  expect(sourceQueue.matches('previous', 'old-card')).toBe(true)
})

it('surfaces a native entry failure through the user-facing card action', async () => {
  const { openScene } = await import('@/services/navigation')
  ports.request.mockResolvedValue({ id: 'q', source: 'favorites', total: 1 })
  vi.mocked(uni.navigateTo).mockImplementation((options) => {
    options!.fail?.({ errMsg: 'stack full' })
    return undefined as never
  })
  await openScene('card', 'favorites')
  expect(uni.showToast).toHaveBeenCalledWith({ title: '场景暂未打开，请重试', icon: 'none' })
  expect(sourceQueue.matches('q', 'card')).toBe(false)
})

it('creates a learning queue with an explicit category and retains it in the route', async () => {
  ports.request.mockResolvedValue({
    id: 'q',
    source: 'learning',
    total: 2,
    content_type: 'intensive'
  })
  await openSourceScene('learning', 'card', undefined, 'intensive')
  expect(ports.request).toHaveBeenCalledWith(
    '/api/mini/v1/learning-queues',
    expect.objectContaining({
      method: 'POST',
      body: { source: 'learning', card_id: 'card', content_type: 'intensive' }
    })
  )
  expect(uni.navigateTo).toHaveBeenCalledWith(
    expect.objectContaining({
      url: '/sub-packages/scenes/detail?id=card&queue=q&content_type=intensive'
    })
  )
})

it('rejects a late creation from the previous account without navigating or attaching it', async () => {
  let finish!: (value: unknown) => void
  ports.request.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  const pending = openSourceScene('learning', 'card', undefined, 'intensive')
  ports.owner = 'another-owner'
  finish({ id: 'old-queue', source: 'learning', content_type: 'intensive', total: 2 })
  await expect(pending).rejects.toThrow('账号已变化')
  expect(uni.navigateTo).not.toHaveBeenCalled()
  expect(sourceQueue.matches('old-queue', 'card')).toBe(false)
})

it('keeps a guest category in the detail route without creating a private queue', async () => {
  ports.owner = ''
  await openSourceScene('learning', 'card', undefined, 'intensive')
  expect(ports.request).not.toHaveBeenCalled()
  expect(uni.navigateTo).toHaveBeenCalledWith({
    url: '/sub-packages/scenes/detail?id=card&content_type=intensive'
  })
})

it('retains the restricted card category in direct entry without establishing a private queue', async () => {
  const { openScene } = await import('@/services/navigation')
  await openScene('locked', undefined, undefined, 'intensive')
  expect(uni.navigateTo).toHaveBeenCalledWith(
    expect.objectContaining({ url: '/sub-packages/scenes/detail?id=locked&content_type=intensive' })
  )
  expect(ports.request).not.toHaveBeenCalled()
})

it('preserves the existing review operation identity while adding category identity only for typed learning', async () => {
  ports.request.mockRejectedValueOnce(new ApiError('network_unknown', 'unknown'))
  await expect(openSourceScene('favorites', 'card')).rejects.toThrow('unknown')
  expect([...ports.stored.values()].flat()).toContainEqual(
    expect.objectContaining({ action: 'queue:favorites:card:' })
  )
})
