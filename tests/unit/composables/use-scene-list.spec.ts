import { expect, it, vi } from 'vitest'

import { useSceneList } from '@/composables/use-scene-list'

it('appends only the next page, deduplicates ids, and preserves successful content when more fails', async () => {
  const request = vi
    .fn()
    .mockResolvedValueOnce({ items: [{ id: 'one' }], total: 3, published_total: 6 })
    .mockRejectedValueOnce(new Error('page unavailable'))
    .mockResolvedValueOnce({ items: [{ id: 'one' }, { id: 'two' }], total: 3, published_total: 6 })
  const list = useSceneList<{ id: string }>({ path: '/cards', request, ensure: async () => true })
  await list.refresh()
  await list.more()
  expect(list.items.value).toEqual([{ id: 'one' }])
  expect(list.moreError.value).toBe('page unavailable')
  expect(list.total.value).toBe(3)
  await list.more()
  expect(list.items.value).toEqual([{ id: 'one' }, { id: 'two' }])
  expect(request.mock.calls.map((call) => call[0])).toEqual([
    '/cards?page=1&limit=20',
    '/cards?page=2&limit=20',
    '/cards?page=2&limit=20'
  ])
  expect(list.publishedTotal.value).toBe(6)
})

it('does not turn an initial failure into an empty list and retains visible data on refresh failure', async () => {
  const request = vi
    .fn()
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({ items: [{ id: 'one' }], total: 1, published_total: 1 })
    .mockRejectedValueOnce(new Error('offline'))
  const list = useSceneList<{ id: string }>({ path: '/cards', request, ensure: async () => true })
  await list.refresh()
  expect(list.total.value).toBe(null)
  await list.refresh()
  await list.refresh()
  expect(list.items.value).toEqual([{ id: 'one' }])
  expect(list.total.value).toBe(1)
  expect(list.error.value).toBe('offline')
})

it('resets pagination and rejects late results when the visible account changes', async () => {
  let owner = 'one',
    finish: (value: unknown) => void = () => undefined
  const request = vi
    .fn()
    .mockResolvedValueOnce({ items: [{ id: 'private-one' }], total: 30 })
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    .mockResolvedValue({ items: [{ id: 'private-two' }], total: 1 })
  const list = useSceneList<{ id: string }>({
    path: '/cards',
    request,
    ensure: async () => true,
    userId: () => owner
  })
  await list.refresh()
  const old = list.more()
  await Promise.resolve()
  owner = 'two'
  await list.refresh()
  finish({ items: [{ id: 'late-private-one' }], total: 30 })
  await old
  expect(list.items.value).toEqual([{ id: 'private-two' }])
  expect(list.total.value).toBe(1)
  expect(list.moreError.value).toBe('')
  expect(list.busy.value).toBe(false)
})

it('uses confirmed page boundaries so duplicate entries do not request endless pages', async () => {
  const request = vi
    .fn()
    .mockResolvedValueOnce({ items: [{ id: 'one' }], total: 3, page: 1, limit: 2 })
    .mockResolvedValueOnce({ items: [{ id: 'one' }, { id: 'two' }], total: 3, page: 2, limit: 2 })
  const list = useSceneList<{ id: string }>({ path: '/cards', request, ensure: async () => true })
  await list.refresh()
  await list.more()
  expect(list.items.value).toEqual([{ id: 'one' }, { id: 'two' }])
  expect(list.hasMore.value).toBe(false)
  expect(list.done.value).toBe(true)
  await list.more()
  expect(request).toHaveBeenCalledTimes(2)
})
