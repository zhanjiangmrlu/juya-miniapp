import { expect, it, vi } from 'vitest'

import { useSceneList } from '@/composables/use-scene-list'
import { ApiError } from '@/services/errors'

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
    '/cards?page=1&limit=3',
    '/cards?page=2&limit=3',
    '/cards?page=2&limit=3'
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

it('freezes the screen limit while appending and refreshing the full read range', async () => {
  let screenLimit = 3
  const request = vi.fn().mockResolvedValue({ items: [{ id: 'one' }], total: 99 })
  const list = useSceneList<{ id: string }>({
    path: '/cards',
    request,
    ensure: async () => true,
    pageSize: () => screenLimit
  })
  await list.refresh()
  screenLimit = 6
  await list.more()
  await list.refresh()
  expect(request.mock.calls.map(([path]) => path)).toEqual([
    '/cards?page=1&limit=3',
    '/cards?page=2&limit=3',
    '/cards?page=1&limit=3',
    '/cards?page=2&limit=3'
  ])
  list.reset()
  await list.refresh()
  expect(request.mock.calls.at(-1)?.[0]).toBe('/cards?page=1&limit=6')
})

it('does not publish an old-account failure and can reload under the next owner', async () => {
  let owner = 'one',
    rejectOld: (reason: unknown) => void = () => undefined
  const request = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectOld = reject
        })
    )
    .mockResolvedValue({ items: [{ id: 'new-owner' }], total: 1 })
  const list = useSceneList<{ id: string }>({
    path: '/cards',
    request,
    ensure: async () => true,
    userId: () => owner
  })
  const pending = list.refresh()
  await Promise.resolve()
  owner = 'two'
  rejectOld(new Error('private old error'))
  await pending
  expect(list.error.value).toBe('')
  await list.refresh()
  expect(list.items.value).toEqual([{ id: 'new-owner' }])
})

it('coalesces overlapping refreshes until the actual read range has settled', async () => {
  let finish: (value: unknown) => void = () => undefined
  const request = vi.fn().mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  const list = useSceneList<{ id: string }>({ path: '/cards', request, ensure: async () => true })
  const first = list.refresh()
  await Promise.resolve()
  let settled = false
  const second = list.refresh().then(() => {
    settled = true
  })
  await Promise.resolve()
  expect(settled).toBe(false)
  expect(request).toHaveBeenCalledOnce()
  finish({ items: [{ id: 'one' }], total: 1 })
  await Promise.all([first, second])
  expect(list.busy.value).toBe(false)
})

it('waits for an in-flight append before pull refresh and does not strand the refresh lock', async () => {
  let finish: (value: unknown) => void = () => undefined
  const request = vi
    .fn()
    .mockResolvedValueOnce({ items: [{ id: 'one' }], total: 99 })
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    .mockResolvedValue({ items: [{ id: 'fresh' }], total: 1 })
  const list = useSceneList<{ id: string }>({ path: '/cards', request, ensure: async () => true })
  await list.refresh()
  const more = list.more()
  await Promise.resolve()
  const pull = list.refresh()
  finish({ items: [{ id: 'two' }], total: 99 })
  await Promise.all([more, pull])
  expect(request.mock.calls.map(([path]) => path)).toEqual([
    '/cards?page=1&limit=3',
    '/cards?page=2&limit=3',
    '/cards?page=1&limit=3',
    '/cards?page=2&limit=3'
  ])
  await list.refresh()
  expect(request).toHaveBeenCalledTimes(6)
})

it('starts a new first-page round with a recalculated screen limit only on successful pull refresh', async () => {
  let screenLimit = 3
  const request = vi.fn().mockResolvedValue({ items: [{ id: 'old' }], total: 99 })
  const list = useSceneList<{ id: string }>({
    path: '/cards',
    request,
    ensure: async () => true,
    pageSize: () => screenLimit
  })
  await list.refresh()
  await list.more()
  screenLimit = 6
  request.mockResolvedValue({ items: [{ id: 'new-first' }], total: 99 })
  await list.restart()
  expect(request.mock.calls.at(-1)?.[0]).toBe('/cards?page=1&limit=6')
  expect(list.items.value).toEqual([{ id: 'new-first' }])
  await list.refresh()
  expect(request.mock.calls.at(-1)?.[0]).toBe('/cards?page=1&limit=6')
  await list.more()
  expect(request.mock.calls.at(-1)?.[0]).toBe('/cards?page=2&limit=6')
})

it('keeps the trusted old range and limit if a new first-page round fails', async () => {
  let screenLimit = 3
  const request = vi.fn().mockResolvedValue({ items: [{ id: 'old' }], total: 99 })
  const list = useSceneList<{ id: string }>({
    path: '/cards',
    request,
    ensure: async () => true,
    pageSize: () => screenLimit
  })
  await list.refresh()
  await list.more()
  screenLimit = 6
  request.mockRejectedValueOnce(new Error('fresh first page failed'))
  await list.restart()
  expect(list.items.value).toEqual([{ id: 'old' }])
  expect(list.total.value).toBe(99)
  expect(list.error.value).toContain('fresh first page failed')
  await list.more()
  expect(request.mock.calls.at(-1)?.[0]).toBe('/cards?page=3&limit=3')
  await list.refresh()
  expect(request.mock.calls.slice(-3).map(([path]) => path)).toEqual([
    '/cards?page=1&limit=3',
    '/cards?page=2&limit=3',
    '/cards?page=3&limit=3'
  ])
})

it('invalidates a late old append when pull starts the new round', async () => {
  let finish: (value: unknown) => void = () => undefined
  const request = vi
    .fn()
    .mockResolvedValueOnce({ items: [{ id: 'old' }], total: 99 })
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    .mockResolvedValue({ items: [{ id: 'fresh' }], total: 5 })
  const list = useSceneList<{ id: string }>({ path: '/cards', request, ensure: async () => true })
  await list.refresh()
  const old = list.more()
  await Promise.resolve()
  await list.restart()
  finish({ items: [{ id: 'late-old' }], total: 99 })
  await old
  expect(list.items.value).toEqual([{ id: 'fresh' }])
  expect(list.total.value).toBe(5)
  expect(list.moreBusy.value).toBe(false)
  await list.more()
  expect(request.mock.calls.at(-1)?.[0]).toBe('/cards?page=2&limit=3')
})

it('coalesces the new round and ignores an older retained-range refresh response', async () => {
  const finishes: ((value: unknown) => void)[] = []
  const request = vi
    .fn()
    .mockResolvedValueOnce({ items: [{ id: 'old' }], total: 99 })
    .mockImplementation(
      () =>
        new Promise((resolve) => {
          finishes.push(resolve)
        })
    )
  const list = useSceneList<{ id: string }>({ path: '/cards', request, ensure: async () => true })
  await list.refresh()
  const old = list.refresh()
  await Promise.resolve()
  const fresh = list.restart(),
    duplicate = list.restart()
  await Promise.resolve()
  expect(request).toHaveBeenCalledTimes(3)
  finishes[1]!({ items: [{ id: 'fresh' }], total: 5 })
  await Promise.all([fresh, duplicate])
  finishes[0]!({ items: [{ id: 'late-old' }], total: 99 })
  await old
  expect(list.items.value).toEqual([{ id: 'fresh' }])
  expect(list.total.value).toBe(5)
})

it('combines server-side note filters with paging without changing the collection query', async () => {
  const request = vi
    .fn()
    .mockResolvedValueOnce({ items: [{ id: 'one' }], total: 3, page: 1, limit: 2 })
    .mockResolvedValueOnce({ items: [{ id: 'two' }], total: 3, page: 2, limit: 2 })
  const list = useSceneList<{ id: string }>({
    path: '/cards?scope=published&has_study_note=true',
    request,
    ensure: async () => true,
    pageSize: () => 2
  })
  await list.refresh()
  await list.more()
  expect(request.mock.calls.map(([path]) => path)).toEqual([
    '/cards?scope=published&has_study_note=true&page=1&limit=2',
    '/cards?scope=published&has_study_note=true&page=2&limit=2'
  ])
})

it.each([0, 1])(
  'reconverges a shrunken collection of %i instead of keeping removed notes beside the empty state',
  async (total) => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        items: [{ id: 'removed' }, { id: 'also-removed' }],
        total: 5,
        page: 1,
        limit: 2
      })
      .mockResolvedValueOnce({
        items: total ? [{ id: 'remaining' }] : [],
        total,
        page: 1,
        limit: 2
      })
      .mockResolvedValueOnce({
        items: total ? [{ id: 'remaining' }] : [],
        total,
        page: 1,
        limit: 2
      })
    const list = useSceneList<{ id: string }>({
      path: '/cards?scope=published&has_study_note=true',
      request,
      ensure: async () => true,
      pageSize: () => 2
    })
    await list.refresh()
    await list.more()
    expect(list.items.value).toEqual(total ? [{ id: 'remaining' }] : [])
    expect(list.total.value).toBe(total)
    expect(list.hasMore.value).toBe(false)
    expect(list.moreBusy.value).toBe(false)
    expect(request.mock.calls.map(([path]) => path)).toEqual([
      '/cards?scope=published&has_study_note=true&page=1&limit=2',
      '/cards?scope=published&has_study_note=true&page=2&limit=2',
      ...(total ? ['/cards?scope=published&has_study_note=true&page=1&limit=2'] : [])
    ])
  }
)

it('rejects a not-ready category snapshot without inventing an empty collection', async () => {
  const request = vi.fn().mockResolvedValue({
    items: [],
    total: 0,
    content_types_ready: false,
    type_published_total: null
  })
  const list = useSceneList({
    path: '/cards?content_type=illustrated',
    request,
    ensure: async () => true
  })
  await list.refresh()
  expect(list.total.value).toBe(null)
  expect(list.error.value).toBe('词汇分类准备中，请稍后重试')
})

it('uses the category published count rather than the module total', async () => {
  const request = vi.fn().mockResolvedValue({
    items: [],
    total: 0,
    published_total: 24,
    type_published_total: 0,
    content_types_ready: true
  })
  const list = useSceneList({
    path: '/cards?content_type=intensive',
    request,
    ensure: async () => true
  })
  await list.refresh()
  expect(list.publishedTotal.value).toBe(0)
})

it('clears a previously enabled category when the server withdraws readiness', async () => {
  const request = vi
    .fn()
    .mockResolvedValueOnce({
      items: [{ id: 'old' }],
      total: 1,
      type_published_total: 1,
      content_types_ready: true
    })
    .mockResolvedValueOnce({
      items: [],
      total: 0,
      type_published_total: null,
      content_types_ready: false
    })
  const list = useSceneList({
    path: '/cards?content_type=intensive',
    request,
    ensure: async () => true
  })
  await list.refresh()
  await list.refresh()
  expect(list.items.value).toEqual([])
  expect(list.total.value).toBe(null)
})

it('retains only the read range during a login identity boundary and reloads every page for the new owner', async () => {
  let owner = 'guest'
  const request = vi.fn().mockImplementation(async (path: string) => ({
    items: [{ id: `${owner}:${path}` }],
    total: 9,
    page: Number(new URL(path, 'http://local').searchParams.get('page')),
    limit: 3
  }))
  const list = useSceneList<{ id: string }>({
    path: '/cards',
    request,
    ensure: async () => true,
    userId: () => owner
  })
  await list.refresh()
  await list.more()
  owner = 'learner'
  list.reset(true)
  expect(list.items.value).toEqual([])
  expect(list.total.value).toBe(null)
  await list.refresh()
  expect(request.mock.calls.slice(-2).map(([path]) => path)).toEqual([
    '/cards?page=1&limit=3',
    '/cards?page=2&limit=3'
  ])
  expect(list.items.value.every((item) => item.id.startsWith('learner:'))).toBe(true)
})

it('withdraws stale typed content on an explicit category configuration failure', async () => {
  const request = vi
    .fn()
    .mockResolvedValueOnce({
      items: [{ id: 'stale' }],
      total: 1,
      type_published_total: 1,
      content_types_ready: true
    })
    .mockRejectedValueOnce(new ApiError('content_type_bindings_invalid', '词汇分类配置异常', 503))
  const list = useSceneList<{ id: string }>({
    path: '/cards?content_type=intensive',
    request,
    ensure: async () => true
  })
  await list.refresh()
  await list.refresh()
  expect(list.items.value).toEqual([])
  expect(list.total.value).toBe(null)
  expect(list.error.value).toBe('词汇分类配置异常')
})

it('offers a full refresh retry when readiness is withdrawn during pagination', async () => {
  const request = vi
    .fn()
    .mockResolvedValueOnce({
      items: [{ id: 'one' }],
      total: 9,
      type_published_total: 9,
      content_types_ready: true,
      page: 1,
      limit: 3
    })
    .mockResolvedValueOnce({
      items: [],
      total: 0,
      type_published_total: null,
      content_types_ready: false,
      page: 2,
      limit: 3
    })
  const list = useSceneList<{ id: string }>({
    path: '/cards?content_type=intensive',
    request,
    ensure: async () => true
  })
  await list.refresh()
  await list.more()
  expect(list.total.value).toBe(null)
  expect(list.error.value).toBe('词汇分类准备中，请稍后重试')
  expect(list.moreError.value).toBe('')
})
