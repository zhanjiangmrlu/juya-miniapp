// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const ports = vi.hoisted(() => ({
  owner: 'owner-1',
  expired: undefined as undefined | (() => void),
  request: vi.fn(),
  home: vi.fn()
}))
vi.mock('@/services/api', () => ({
  session: { userId: () => ports.owner, request: ports.request },
  onSessionExpired: (callback: () => void) => {
    ports.expired = callback
    return () => {
      ports.expired = undefined
    }
  }
}))
vi.mock('@/stores/account-store', () => ({ useAccountStore: () => ({ ensure: async () => true }) }))
vi.mock('@/features/listening/listening-service', () => ({ getListeningHome: ports.home }))

import { useListeningCatalog } from '@/features/listening/use-listening-catalog'

let model: ReturnType<typeof useListeningCatalog> | undefined
beforeEach(() => {
  ports.owner = 'owner-1'
  ports.request.mockReset().mockImplementation(async (path: string) => ({
    items: path.includes('category_id=c2')
      ? [{ id: 'c2-article' }]
      : [{ id: 'c1-article' }, { id: 'c2-article' }],
    total: path.includes('category_id=c2') ? 1 : 2,
    page: 1,
    limit: 20
  }))
  ports.home
    .mockReset()
    .mockResolvedValue({ categories: [{ id: 'c1' }, { id: 'c2' }], continue_learning: null })
})
afterEach(() => model?.dispose())

it.each(['session expiry', 'account switch'])(
  'keeps the reset category and actual request aligned after %s',
  async (reason) => {
    model = useListeningCatalog()
    await model.load()
    await model.select('c2')
    expect(model.category.value).toBe('c2')
    expect(model.articles.value.map((item) => item.id)).toEqual(['c2-article'])
    model.scrollTop.value = 480
    if (reason === 'session expiry') ports.expired?.()
    else ports.owner = 'owner-2'
    ports.request.mockClear()
    await model.load()
    expect(model.category.value).toBe('')
    expect(model.selectedCategory.value).toBeUndefined()
    expect(model.scrollTop.value).toBe(0)
    expect(ports.request.mock.calls.map((call) => call[0])).toEqual([
      expect.not.stringContaining('category_id=')
    ])
    expect(model.articles.value.map((item) => item.id)).toEqual(['c1-article', 'c2-article'])
    await model.select('')
    expect(model.articles.value).toHaveLength(2)
  }
)
