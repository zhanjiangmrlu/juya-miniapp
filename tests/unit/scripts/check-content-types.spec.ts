import path from 'node:path'

import { expect, it, vi } from 'vitest'

const script = path.resolve('scripts/check-content-types.mjs')
/** 构造独立的分类列表响应，type 为词汇类别，count 为该类别总量 */
const page = (type: string, count = 1) => ({
  content_types_ready: true,
  type_published_total: count,
  published_total: 2,
  total: count,
  items: count ? [{ id: 'fixture', content_type: type }] : []
})

it('probes both production published categories without credentials or redirects', async () => {
  const { checkProductionContentTypes } = await import(script)
  const requests: { url: URL; options: RequestInit }[] = []
  const result = await checkProductionContentTypes({
    fetchImpl: async (input: string, options: RequestInit) => {
      const url = new URL(input)
      requests.push({ url, options })
      return Response.json(page(url.searchParams.get('content_type')!))
    }
  })
  expect(result).toEqual({ illustrated: 1, intensive: 1, publishedTotal: 2 })
  expect(requests.map(({ url }) => url.searchParams.get('content_type'))).toEqual([
    'illustrated',
    'intensive'
  ])
  for (const { url, options } of requests) {
    expect(url.origin + url.pathname).toBe('https://api.juyayingyu.com/api/mini/v1/cards')
    expect(url.searchParams.get('scope')).toBe('published')
    expect(url.searchParams.get('limit')).toBe('1')
    expect(url.searchParams.get('page')).toBe('1')
    expect(options.redirect).toBe('error')
    expect(options.credentials).toBe('omit')
    expect(options.signal).toBeInstanceOf(AbortSignal)
  }
})

it.each([0, 2])(
  'accepts a ready category with %i items while the other category accounts for the remainder',
  async (count) => {
    const { checkProductionContentTypes } = await import(script)
    const result = await checkProductionContentTypes({
      fetchImpl: async (input: string) => {
        const type = new URL(input).searchParams.get('content_type')!
        return Response.json(page(type, type === 'illustrated' ? count : 2 - count))
      }
    })
    expect(result.publishedTotal).toBe(2)
    expect(result.illustrated).toBe(count)
  }
)

it.each([
  { content_types_ready: false },
  { content_types_ready: undefined },
  { content_types_ready: 'true' },
  { type_published_total: null },
  { type_published_total: -1 },
  { type_published_total: 1.5 },
  { type_published_total: true },
  { published_total: null },
  { published_total: 3 },
  { total: 0 },
  { items: [] },
  { items: [{ id: 'wrong', content_type: 'intensive' }] }
])('rejects incomplete or inconsistent category data: %j', async (broken) => {
  const { checkProductionContentTypes } = await import(script)
  await expect(
    checkProductionContentTypes({
      fetchImpl: async (input: string) => {
        const type = new URL(input).searchParams.get('content_type')!
        return Response.json({ ...page(type), ...(type === 'illustrated' ? broken : {}) })
      }
    })
  ).rejects.toThrow(/分类.*核对|分类.*启用/)
})

it.each([
  new Response('secret server error', { status: 503 }),
  new Response('not json'),
  Response.json(null),
  new Response(null, { status: 302 })
])('rejects bad HTTP responses without echoing response bodies', async (response) => {
  const { checkProductionContentTypes } = await import(script)
  await expect(
    checkProductionContentTypes({ fetchImpl: async () => response.clone() })
  ).rejects.toThrow(/分类/)
})

it('rejects a network timeout without leaking its original message', async () => {
  const { checkProductionContentTypes } = await import(script)
  const fetchImpl = vi.fn().mockRejectedValue(new Error('sensitive connection details'))
  await expect(checkProductionContentTypes({ fetchImpl })).rejects.toThrow(/分类/)
  await expect(checkProductionContentTypes({ fetchImpl })).rejects.not.toThrow(/sensitive/)
})
