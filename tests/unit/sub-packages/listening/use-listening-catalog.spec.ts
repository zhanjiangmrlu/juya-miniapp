// @vitest-environment happy-dom
import { flushPromises, shallowMount } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { analytics } from '@/services/analytics'

const ports = vi.hoisted(() => ({
  owner: 'owner-1',
  expired: undefined as undefined | (() => void),
  request: vi.fn(),
  home: vi.fn(),
  show: undefined as undefined | (() => void),
  load: undefined as undefined | ((query: Record<string, string>) => void),
  unload: undefined as undefined | (() => void)
}))
vi.mock('@dcloudio/uni-app', () => ({
  onHide: vi.fn(),
  onShareAppMessage: vi.fn(),
  onShareTimeline: vi.fn(),
  onLoad: (callback: typeof ports.load) => {
    ports.load = callback
  },
  onShow: (callback: typeof ports.show) => {
    ports.show = callback
  },
  onUnload: (callback: typeof ports.unload) => {
    ports.unload = callback
  }
}))
vi.mock('@/services/api', () => ({
  session: {
    identity: () => ports.owner,
    userId: () => ports.owner,
    contentRequest: ports.request,
    request: ports.request
  },
  onSessionExpired: (callback: () => void) => {
    ports.expired = callback
    return () => {
      ports.expired = undefined
    }
  }
}))
vi.mock('@/stores/account-store', () => ({
  useAccountStore: () => ({ restore: async () => null, ensure: async () => true })
}))
vi.mock('@/features/listening/listening-service', () => ({
  getListeningHome: ports.home,
  openListeningArticle: vi.fn()
}))

import ListeningArticleCard from '@/features/listening/components/listening-article-card.vue'
import { loginReturn } from '@/services/login-return'
import { Routes } from '@/shared/constants/navigation'
import ListeningCatalogPage from '@/sub-packages/listening/index.vue'
import { useListeningCatalog } from '@/sub-packages/listening/use-listening-catalog'

let model: ReturnType<typeof useListeningCatalog> | undefined
beforeEach(() => {
  loginReturn.cancel()
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

/** 创建可控制完成顺序的请求，模拟统计与列表各自的网络延迟 */
const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<T>((accept, fail) => {
    resolve = accept
    reject = fail
  })
  return { promise, resolve, reject }
}

it('publishes the first article page while home statistics are still pending', async () => {
  const home = deferred<unknown>()
  ports.home.mockReturnValue(home.promise)
  model = useListeningCatalog()
  const loading = model.load()
  await flushPromises()
  expect(model.articles.value.map((item) => item.id)).toEqual(['c1-article', 'c2-article'])
  expect(model.list.value.busy.value).toBe(false)
  expect(model.busy.value).toBe(true)
  home.resolve({ categories: [], continue_learning: null })
  await loading
  expect(model.busy.value).toBe(false)
})

it('keeps successful articles visible when home statistics fail', async () => {
  ports.home.mockRejectedValue(new Error('统计暂不可用'))
  model = useListeningCatalog()
  await model.load()
  expect(model.articles.value.map((item) => item.id)).toEqual(['c1-article', 'c2-article'])
  expect(model.error.value).toBe('统计暂不可用')
  expect(model.list.value.error.value).toBe('')
})

it('deduplicates pending statistics without replaying the old category after selection', async () => {
  const home = deferred<unknown>(),
    articles = deferred<unknown>()
  ports.home.mockReturnValue(home.promise)
  ports.request.mockReturnValueOnce(articles.promise)
  model = useListeningCatalog()
  const first = model.load(),
    second = model.load()
  await flushPromises()
  expect(ports.request).toHaveBeenCalledOnce()
  await model.select('c2')
  expect(model.articles.value.map((item) => item.id)).toEqual(['c2-article'])
  articles.resolve({ items: [{ id: 'late-all' }], total: 1, page: 1, limit: 20 })
  home.resolve({ categories: [{ id: 'c2' }], continue_learning: null })
  await Promise.all([first, second])
  expect(model.category.value).toBe('c2')
  expect(model.articles.value.map((item) => item.id)).toEqual(['c2-article'])
  expect(ports.home).toHaveBeenCalledOnce()
  expect(ports.request.mock.calls.map((call) => call[0])).toEqual([
    expect.not.stringContaining('category_id='),
    expect.stringContaining('category_id=c2')
  ])
})

/** 挂载真实页面生命周期，保留状态组件以验证页面分区和重试动作 */
const mountPage = () =>
  shallowMount(ListeningCatalogPage, {
    global: {
      stubs: {
        AppPage: { template: '<div><slot /></div>' },
        AppState: false,
        'scroll-view': { template: '<div><slot /></div>' }
      }
    }
  })

it('requests a category deep link first page once on the initial show', async () => {
  const page = mountPage()
  try {
    ports.load?.({ category_id: 'c2' })
    ports.show?.()
    await flushPromises()
    expect(ports.request.mock.calls.map((call) => call[0])).toEqual([
      expect.stringContaining('category_id=c2')
    ])
    expect(page.findAllComponents(ListeningArticleCard)).toHaveLength(1)
  } finally {
    ports.unload?.()
    page.unmount()
  }
})

it('renders article cards before home statistics finish and retries only the failed statistics', async () => {
  const home = deferred<unknown>()
  ports.home.mockReturnValueOnce(home.promise)
  const page = mountPage()
  try {
    ports.load?.({})
    ports.show?.()
    await flushPromises()
    expect(page.findAllComponents(ListeningArticleCard)).toHaveLength(2)
    home.reject(new Error('统计暂不可用'))
    await flushPromises()
    expect(page.findAllComponents(ListeningArticleCard)).toHaveLength(2)
    ports.home.mockResolvedValue({ categories: [], continue_learning: null })
    await page.get('.listening-header .notice-retry').trigger('click')
    await flushPromises()
    expect(page.text()).not.toContain('统计暂不可用')
    expect(ports.request).toHaveBeenCalledOnce()
    expect(ports.home).toHaveBeenCalledTimes(2)
  } finally {
    ports.unload?.()
    page.unmount()
  }
})

it('retries only a failed article list while keeping successful home statistics', async () => {
  ports.request.mockRejectedValueOnce(new Error('文章暂不可用'))
  const page = mountPage()
  try {
    ports.show?.()
    await flushPromises()
    await page.get('.article-scroll .state-retry').trigger('click')
    await flushPromises()
    expect(page.findAllComponents(ListeningArticleCard)).toHaveLength(2)
    expect(ports.home).toHaveBeenCalledOnce()
    expect(ports.request).toHaveBeenCalledTimes(2)
  } finally {
    ports.unload?.()
    page.unmount()
  }
})

it('rejects late statistics and articles from the previous account', async () => {
  const oldHome = deferred<unknown>(),
    oldArticles = deferred<unknown>()
  ports.home.mockReturnValueOnce(oldHome.promise)
  ports.request.mockReturnValueOnce(oldArticles.promise)
  model = useListeningCatalog()
  const oldLoad = model.load()
  await flushPromises()
  ports.owner = 'owner-2'
  await model.load()
  oldHome.resolve({ categories: [{ id: 'private-old-category' }], continue_learning: null })
  oldArticles.resolve({ items: [{ id: 'private-old-article' }], total: 1 })
  await oldLoad
  expect(model.home.value?.categories.map((item) => item.id)).toEqual(['c1', 'c2'])
  expect(model.articles.value.map((item) => item.id)).toEqual(['c1-article', 'c2-article'])
  expect(model.busy.value).toBe(false)
  expect(model.error.value).toBe('')
})

it('preserves loaded pagination and scroll when refreshing after an article return', async () => {
  ports.request.mockImplementation(async (path: string) => {
    const page = Number(new URL(path, 'https://fixture.invalid').searchParams.get('page'))
    return { items: [{ id: `article-${page}` }], total: 3, page, limit: 1 }
  })
  model = useListeningCatalog()
  await model.load()
  await model.list.value.more()
  model.scrollTop.value = 480
  ports.request.mockClear()
  await model.load()
  expect(model.scrollTop.value).toBe(480)
  expect(model.articles.value.map((item) => item.id)).toEqual(['article-1', 'article-2'])
  expect(ports.request.mock.calls.map((call) => call[0])).toEqual([
    expect.stringContaining('page=1'),
    expect.stringContaining('page=2')
  ])
  expect(model.list.value.hasMore.value).toBe(true)
})

it('falls back to the actual all-articles collection when a restored category no longer exists', async () => {
  model = useListeningCatalog()
  model.category.value = 'c2'
  ports.home.mockResolvedValue({ categories: [{ id: 'c1' }], continue_learning: null })
  await model.load()
  expect(model.category.value).toBe('')
  expect(ports.request.mock.calls.at(-1)?.[0]).not.toContain('category_id=')
  expect(model.articles.value.map((item) => item.id)).toEqual(['c1-article', 'c2-article'])
})

it.each(['success', 'cancel'])(
  'restores a valid category, position and loaded range after login %s',
  async (result) => {
    ports.request.mockImplementation(async (path: string) => {
      const page = Number(new URL(path, 'https://fixture.invalid').searchParams.get('page'))
      return { items: [{ id: `article-${page}` }], total: 3, page, limit: 1 }
    })
    model = useListeningCatalog()
    await model.load()
    await model.select('c2')
    await model.list.value.more()
    model.scrollTop.value = 480
    loginReturn.begin(Routes.LISTENING)
    ports.expired?.()
    if (result === 'success') {
      ports.owner = 'owner-2'
      loginReturn.succeed()
    } else loginReturn.resumeGuest()
    await model.load()
    expect(model.category.value).toBe('c2')
    expect(model.scrollTop.value).toBe(480)
    expect(model.articles.value.map((item) => item.id)).toEqual(['article-1', 'article-2'])
  }
)

it('does not replay an all-category snapshot after identity invalidates during restoration', async () => {
  model = useListeningCatalog()
  await model.load()
  model.scrollTop.value = 480
  loginReturn.begin(Routes.LISTENING)
  ports.expired?.()
  loginReturn.succeed()
  const home = deferred<unknown>()
  ports.home.mockReturnValueOnce(home.promise)
  const loading = model.load()
  await flushPromises()
  ports.expired?.()
  home.resolve({ categories: [{ id: 'c1' }], continue_learning: null })
  await loading
  expect(model.scrollTop.value).toBe(0)
})

it('records only an actual user category change, not initial loading or restoration', async () => {
  const track = vi.spyOn(analytics, 'track')
  try {
    model = useListeningCatalog()
    await model.load()
    expect(track.mock.calls.filter(([event]) => event === 'category_select')).toEqual([])
    await model.select('c2')
    await model.select('c2')
    expect(track.mock.calls.filter(([event]) => event === 'category_select')).toEqual([
      ['category_select', expect.objectContaining({ category_id: 'c2', content_type: 'listening' })]
    ])
  } finally {
    track.mockRestore()
  }
})
