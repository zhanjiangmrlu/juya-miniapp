import { expect, it, vi } from 'vitest'

import { ApiError } from '@/services/errors'
import { createOperationService } from '@/services/operation-service'
const current = vi.hoisted(() => ({ operations: null as unknown, request: vi.fn() }))
vi.mock('@/services/api', () => ({
  get operations() {
    return current.operations
  },
  session: { request: current.request, userId: () => 'owner' }
}))
vi.mock('@/services/platform', () => ({ resourceURL: (path: string) => path }))
import { saveListeningProgress, writeListening } from '@/features/listening/listening-service'
it.each(['complete', 'favorite', 'progress'])(
  'recovers %s with the original key and safe frozen request after a process restart',
  async (action) => {
    const stored = new Map<string, unknown>()
    const request = vi.fn().mockRejectedValueOnce(new ApiError('network_unknown', 'offline'))
    const ports = {
      session: { request, userId: () => 'owner' },
      storage: {
        get: (key: string) => stored.get(key),
        set: (key: string, value: unknown) => stored.set(key, structuredClone(value)),
        remove: (key: string) => stored.delete(key)
      },
      key: () => 'original-key'
    }
    current.operations = createOperationService(ports)
    const body = {
      version_id: 'v1',
      reading_position: 10,
      translation_open: false,
      audio_position: 0,
      playback_rate: 1 as const
    }
    const submit = () =>
      action === 'progress'
        ? saveListeningProgress('a', body)
        : writeListening(
            `listening-${action}:a`,
            `/articles/a/${action}`,
            action === 'complete' ? 'POST' : 'PUT',
            { version_id: 'v1' }
          )
    await expect(submit()).rejects.toThrow('offline')
    current.operations = createOperationService({ ...ports, key: () => 'must-not-be-used' })
    request
      .mockRejectedValueOnce(new ApiError('operation_unknown', 'missing', 404))
      .mockResolvedValueOnce({ accepted: true })
    if (action === 'progress') request.mockResolvedValueOnce({ accepted: true })
    await expect(submit()).resolves.toMatchObject({ accepted: true })
    const replay = request.mock.calls.find(
      (call) => call[1]?.key === 'original-key' && call !== request.mock.calls[0]
    )!
    expect(replay).toBeDefined()
    expect(replay[1]?.body).toEqual(action === 'progress' ? body : { version_id: 'v1' })
  }
)

it('explicitly rebinds an older metadata-only pending record using its original key after lookup', async () => {
  const { OPERATIONS_STORAGE_PREFIX } = await import('@/shared/constants/http')
  const stored = new Map<string, unknown>([
    [
      OPERATIONS_STORAGE_PREFIX + 'owner',
      [
        {
          action: 'listening-complete:a',
          path: '/api/mini/v1/listening/articles/a/complete',
          method: 'POST',
          key: 'legacy-original'
        }
      ]
    ]
  ])
  const request = vi
    .fn()
    .mockRejectedValueOnce(new ApiError('operation_unknown', 'missing', 404))
    .mockResolvedValueOnce({ accepted: true })
  current.operations = createOperationService({
    session: { request, userId: () => 'owner' },
    storage: {
      get: (key) => stored.get(key),
      set: (key, value) => stored.set(key, structuredClone(value)),
      remove: (key) => stored.delete(key)
    },
    key: () => 'new-key-forbidden'
  })
  current.request.mockResolvedValue({ version_id: 'v1' })
  vi.stubGlobal('uni', {
    showModal: (options: { success: (result: { confirm: boolean }) => void }) =>
      options.success({ confirm: true })
  })
  await expect(
    writeListening('listening-complete:a', '/articles/a/complete', 'POST', { version_id: 'v1' })
  ).resolves.toEqual({ accepted: true })
  expect(request.mock.calls[1]![1]).toEqual({
    method: 'POST',
    key: 'legacy-original',
    body: { version_id: 'v1' }
  })
  vi.unstubAllGlobals()
})
