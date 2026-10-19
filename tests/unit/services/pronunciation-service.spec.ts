import { expect, it } from 'vitest'

it('submits one controlled reference and polls the same target until ready', async () => {
  const { loadPronunciation } = await import('@/services/pronunciation-service')
  const calls: unknown[] = []
  let reads = 0
  const value = await loadPronunciation(
    {
      request: async (method, path, reference) => {
        calls.push({ method, path, reference })
        if (method === 'POST')
          return { state: 'processing', url: null, job_id: 'one', error_code: null, retry_after: 1 }
        reads++
        return {
          state: reads === 2 ? 'ready' : 'processing',
          url: reads === 2 ? '/api/mini/v1/pronunciation/ticket' : null,
          job_id: 'one',
          error_code: null,
          retry_after: 1
        }
      },
      pause: async () => {},
      active: () => true
    },
    '/controlled-word',
    { version_id: 'published-one' }
  )
  expect(value).toBe('/api/mini/v1/pronunciation/ticket')
  expect(calls).toHaveLength(3)
  expect(calls[0]).toEqual({
    method: 'POST',
    path: '/controlled-word',
    reference: { version_id: 'published-one' }
  })
})
it('cancels polling when the word or page changes and bounds a slow synthesis', async () => {
  const { loadPronunciation } = await import('@/services/pronunciation-service')
  let active = true,
    requests = 0
  const pending = {
    state: 'processing',
    url: null,
    job_id: 'one',
    error_code: null,
    retry_after: 1
  }
  await expect(
    loadPronunciation(
      {
        request: async () => {
          requests++
          return pending
        },
        pause: async () => {
          active = false
        },
        active: () => active
      },
      '/word',
      { version_id: 'one' }
    )
  ).rejects.toThrow()
  expect(requests).toBe(1)
  requests = 0
  await expect(
    loadPronunciation(
      {
        request: async () => {
          requests++
          return pending
        },
        pause: async () => {},
        active: () => true
      },
      '/word',
      { version_id: 'one' },
      3
    )
  ).rejects.toThrow('发音暂不可用')
  expect(requests).toBe(4)
})

it('keeps waiting beyond the former twenty checks and follows the server polling interval', async () => {
  const { loadPronunciation } = await import('@/services/pronunciation-service')
  let queries = 0
  const waits: number[] = []
  const value = await loadPronunciation(
    {
      active: () => true,
      pause: async (milliseconds) => {
        waits.push(milliseconds)
      },
      request: async () => {
        queries++
        return {
          state: queries > 21 ? 'ready' : 'processing',
          url: queries > 21 ? '/ready' : null,
          job_id: 'one',
          error_code: null,
          retry_after: 2
        }
      }
    },
    '/word',
    { version_id: 'one' }
  )
  expect(value).toBe('/ready')
  expect(queries).toBe(22)
  expect(waits).toHaveLength(21)
  expect(waits.every((value) => value === 2000)).toBe(true)
})
