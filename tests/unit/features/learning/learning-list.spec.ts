// @vitest-environment happy-dom
import { config, flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, expect, it, vi } from 'vitest'

config.global.stubs['scroll-view'] = { template: '<div><slot /></div>' }

const ports = vi.hoisted(() => ({
  owner: 'owner',
  keys: 0,
  stored: new Map<string, unknown>(),
  hide: undefined as undefined | (() => void),
  show: undefined as undefined | (() => void),
  expire: undefined as undefined | (() => void),
  request: vi.fn()
}))
vi.mock('@/services/feedback-service', () => ({
  feedbackInbox: { value: { value: { unread: false, count: 0 } }, refresh: vi.fn() }
}))
vi.mock('@dcloudio/uni-app', () => ({
  onLoad: vi.fn(),
  onPageScroll: vi.fn(),
  onHide: (callback: typeof ports.hide) => {
    ports.hide = callback
  },
  onShareAppMessage: vi.fn(),
  onShareTimeline: vi.fn(),
  onShow: (callback: typeof ports.show) => {
    ports.show = callback
  },
  onPullDownRefresh: vi.fn(),
  onReachBottom: vi.fn(),
  onUnload: vi.fn()
}))
vi.mock('@/services/api', async () => {
  const { createOperationService } = await import('@/services/operation-service')
  const session = {
    contentRequest: ports.request,
    request: ports.request,
    identity: () => ports.owner,
    userId: () => ports.owner
  }
  return {
    session,
    operations: createOperationService({
      session,
      key: () =>
        ++ports.keys === 1 ? 'unknown-completion-key' : `unknown-completion-key-${ports.keys}`,
      storage: {
        get: (key) => structuredClone(ports.stored.get(key)),
        set: (key, value) => {
          ports.stored.set(key, structuredClone(value))
        },
        remove: (key) => {
          ports.stored.delete(key)
        }
      }
    }),
    onSessionExpired: (callback: () => void) => {
      ports.expire = callback
      return () => undefined
    }
  }
})
vi.mock('@/stores/account-store', () => ({
  useAccountStore: () => ({
    ensure: async () => true,
    restore: async () => ({ id: 'owner' }),
    refreshStatistics: async () => undefined,
    refreshAvatar: async () => undefined,
    statistics: { checked_in_today: false }
  })
}))
import LearningPage from '@/pages/learning/index.vue'
import { operations } from '@/services/api'
import { ApiError } from '@/services/errors'
import { loginReturn } from '@/services/login-return'
import { runtimeMode } from '@/services/runtime-mode'
import { OPERATIONS_STORAGE_PREFIX } from '@/shared/constants/http'

beforeEach(() => {
  vi.clearAllMocks()
  ports.owner = 'owner'
  ports.keys = 0
  ports.stored.clear()
  operations.clearMemory()
  loginReturn.cancel()
  vi.stubGlobal('uni', { hideTabBar: vi.fn(), navigateTo: vi.fn(), switchTab: vi.fn() })
})
/** 载入给定发布范围的空待学列表
 * @param published 当前已发布卡片数量
 * @param status 服务端返回的原授权状态，用于验证暂停期间不会展示
 */
const open = async (published: number, status?: string) => {
  ports.request.mockResolvedValue({
    items: [],
    total: 0,
    published_total: published,
    type_published_total: published,
    content_types_ready: true,
    ...(status
      ? {
          learning_access: {
            enabled: true,
            free_count: 0,
            actual_free_count: 0,
            revision: 1,
            authorization: {
              status,
              revision: 1,
              starts_on: null,
              expires_on: null,
              expires_at: null
            }
          }
        }
      : {})
  })
  const page = shallowMount(LearningPage, {
    global: {
      stubs: {
        AppPage: { template: '<view><slot /></view>' },
        AppState: {
          name: 'AppState',
          props: ['title', 'empty', 'error'],
          template: '<view v-if="empty"><text>{{ title }}</text><slot /></view>'
        }
      }
    }
  })
  ports.show?.()
  await flushPromises()
  return page
}
it.each(['none', 'active', 'expired'])(
  'hides all grant states in both scene tabs while retaining the learner and check-in status (%s)',
  async (status) => {
    const page = await open(2, status)
    try {
      expect(page.get('.learner-status').text()).toBe('学习者 · 今日待打卡')
      expect(page.text()).not.toMatch(/授权|权限准备中/)
      const tabs = page.findAll('[role="tab"]')
      await tabs[1]!.trigger('click')
      await flushPromises()
      expect(page.get('.learner-status').text()).toBe('学习者 · 今日待打卡')
      expect(page.text()).not.toMatch(/授权|权限准备中/)
    } finally {
      page.unmount()
    }
  }
)
it('distinguishes all learned from no published cards and exposes the full learning-record row', async () => {
  const learned = await open(2)
  expect(learned.findComponent({ name: 'AppState' }).exists()).toBe(true)
  expect(
    learned
      .findAllComponents({ name: 'AppState' })
      .some((state) => state.props('title') === '本类词汇已全部学完')
  ).toBe(true)
  expect(learned.findAll('button').some((button) => button.text() === '去学精读词汇')).toBe(true)
  await learned.get('.records-entry').trigger('click')
  expect(uni.switchTab).toHaveBeenCalledWith({ url: '/pages/records/index' })
  learned.unmount()
  const empty = await open(0)
  expect(
    empty
      .findAllComponents({ name: 'AppState' })
      .some((state) => state.props('title') === '本类暂无词汇')
  ).toBe(true)
  empty.unmount()
})

it('invalidates a pending private list when browseOnly starts so full mode can refresh the current list', async () => {
  let finish: (value: unknown) => void = () => undefined
  ports.request
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    .mockResolvedValue({ items: [], total: 0, published_total: 2 })
  const page = shallowMount(LearningPage, {
    global: { stubs: { AppPage: { template: '<view><slot /></view>' } } }
  })
  ports.show?.()
  await flushPromises()
  expect(ports.request).toHaveBeenCalledTimes(1)
  runtimeMode.update({ apiCategory: 'browseOnly' })
  await flushPromises()
  runtimeMode.update({ apiCategory: 'default' })
  await flushPromises()
  expect(ports.request).toHaveBeenCalledTimes(2)
  finish({ items: [{ id: 'old', name: '过期列表' }], total: 1, published_total: 1 })
  await flushPromises()
  expect(page.findAllComponents({ name: 'SceneCard' })).toHaveLength(0)
  page.unmount()
})

it('removes the in-list refresh and home sharing sheet entries', async () => {
  const page = await open(2)
  expect(page.find('.share-entry').exists()).toBe(false)
  expect(page.findComponent({ name: 'ShareSheet' }).exists()).toBe(false)
  expect(page.find('.refresh-list').exists()).toBe(false)
  page.unmount()
})

it('loads the mutually exclusive intensive uncompleted server collection and keeps independent trustworthy totals on failures', async () => {
  const page = await open(8)
  ports.request.mockResolvedValueOnce({
    items: [{ id: 'review', name: '复习卡', state: { completed: true }, has_study_note: true }],
    total: 19,
    type_published_total: 19,
    content_types_ready: true,
    page: 1,
    limit: 3
  })
  await page.get('[data-tab="intensive"]').trigger('click')
  await flushPromises()
  expect(ports.request.mock.calls.at(-1)?.[0]).toContain(
    '/cards?scope=uncompleted&content_type=intensive&page=1&limit='
  )
  expect(page.get('.catalog-count').text()).toBe('19 张')
  expect(page.findComponent({ name: 'SceneCard' }).props('source')).toBe('learning')
  ports.request.mockRejectedValueOnce(new Error('离线'))
  await page.get('[data-tab="illustrated"]').trigger('click')
  await flushPromises()
  expect(page.find('.catalog-count').exists()).toBe(false)
  ports.request.mockRejectedValueOnce(new Error('离线'))
  await page.get('[data-tab="intensive"]').trigger('click')
  await flushPromises()
  expect(page.get('.catalog-count').text()).toBe('19 张')
  expect(page.findComponent({ name: 'SceneCard' }).props('card').id).toBe('review')
  page.unmount()
})

it('keeps both tabs and does not invent zero for the first notes failure', async () => {
  const page = await open(8)
  ports.request.mockRejectedValueOnce(new Error('离线'))
  await page.get('[data-tab="intensive"]').trigger('click')
  await flushPromises()
  expect(page.find('.catalog-count').exists()).toBe(false)
  expect(page.findAll('[data-tab]')).toHaveLength(2)
  expect(
    page
      .findAllComponents({ name: 'AppState' })
      .some((state) => state.props('title') === '本类暂无词汇')
  ).toBe(true)
  page.unmount()
})

it('clears every tab and its authorization context immediately when the stable account changes', async () => {
  const page = await open(8)
  const granted = { enabled: true, authorization: { status: 'active' } }
  ports.request.mockResolvedValueOnce({
    items: [{ id: 'owner-a', name: 'A的卡片' }],
    total: 7,
    type_published_total: 7,
    content_types_ready: true,
    learning_access: granted
  })
  await page.get('[data-tab="intensive"]').trigger('click')
  await flushPromises()
  ports.request.mockResolvedValueOnce({
    items: [],
    total: 5,
    type_published_total: 5,
    content_types_ready: true,
    learning_access: granted
  })
  await page.get('[data-tab="illustrated"]').trigger('click')
  await flushPromises()
  ports.owner = 'owner-b'
  let fail!: (reason: unknown) => void
  ports.request.mockImplementationOnce(
    () =>
      new Promise((_resolve, reject) => {
        fail = reject
      })
  )
  ports.show?.()
  await flushPromises()
  expect(page.get('.learner-status').text()).not.toContain('授权有效')
  expect(page.find('.catalog-count').exists()).toBe(false)
  fail(new Error('B首屏离线'))
  await flushPromises()
  expect(page.get('.learner-status').text()).not.toContain('授权有效')
  expect(page.findAllComponents({ name: 'SceneCard' })).toHaveLength(0)
  page.unmount()
})

it.each([
  ['intensive', false],
  ['intensive', true],
  ['illustrated', false]
] as const)('ignores a stale pull after navigating to %s (failure %s)', async (tab, fail) => {
  const page = await open(8)
  let settle!: () => void
  ports.request.mockImplementationOnce(
    () =>
      new Promise((resolve, reject) => {
        settle = () => (fail ? reject(new Error('离线')) : resolve({ items: [], total: 0 }))
      })
  )
  await page.get('.scene-scroll').trigger('refresherrefresh')
  await flushPromises()
  await page.get('[data-tab="intensive"]').trigger('click')
  await flushPromises()
  if (tab === 'illustrated') await page.get('[data-tab="illustrated"]').trigger('click')
  const scroll = page.get('.scene-scroll')
  await scroll.trigger('scroll', { detail: { scrollTop: 510 } })
  settle()
  await flushPromises()
  expect(scroll.attributes('scroll-top')).toBe('510')
  page.unmount()
})

it('uses the new slogan and a single guest sync row in both scene tabs', async () => {
  ports.owner = ''
  const page = await open(2)
  expect(page.get('.home-title').text()).toBe('Let English grow with you')
  expect(page.get('.guest-list-intro > text').text()).toBe('登录后可同步收藏与学习记录')
  expect(page.get('.guest-login').text()).toBe('登录')
  await page.get('[data-tab="intensive"]').trigger('click')
  await flushPromises()
  expect(page.get('.home-title').text()).toBe('Let English grow with you')
  page.unmount()
})

it('defaults to illustrated and sends explicit uncompleted types for both identities', async () => {
  for (const owner of ['owner', '']) {
    ports.owner = owner
    const page = await open(12)
    expect(ports.request.mock.calls.at(-1)?.[0]).toContain(
      '/cards?scope=uncompleted&content_type=illustrated&'
    )
    expect(page.get('[data-tab="illustrated"]').attributes('aria-selected')).toBe('true')
    expect(page.get('.section-title').text()).toBe(owner ? '待学词汇' : '词汇列表')
    expect(page.find('.scene-summary').exists()).toBe(Boolean(owner))
    page.unmount()
  }
})

it('does not display a category empty state or a fabricated count before types are ready', async () => {
  const page = await open(8)
  ports.request.mockResolvedValueOnce({
    items: [],
    total: 0,
    content_types_ready: false,
    type_published_total: null
  })
  await page.get('[data-tab="intensive"]').trigger('click')
  await flushPromises()
  expect(page.find('.catalog-count').exists()).toBe(false)
  expect(
    page
      .findAllComponents({ name: 'AppState' })
      .some((state) => String(state.props('error')).includes('词汇分类准备中'))
  ).toBe(true)
  expect(page.text()).not.toContain('本类词汇已全部学完')
  expect(page.text()).not.toContain('本类暂无词汇')
  page.unmount()
})

it('keeps restricted summaries visible and never treats them as all learned', async () => {
  const page = await open(8)
  ports.request.mockResolvedValueOnce({
    items: [{ id: 'locked', name: '受限摘要', access: { can_learn: false } }],
    total: 1,
    type_published_total: 8,
    content_types_ready: true
  })
  await page.get('[data-tab="intensive"]').trigger('click')
  await flushPromises()
  expect(page.get('.catalog-count').text()).toBe('1 张')
  expect(page.findComponent({ name: 'SceneCard' }).props('contentType')).toBe('intensive')
  expect(page.text()).not.toContain('本类词汇已全部学完')
  page.unmount()
})

it.each(['success', 'cancel'])(
  'restores the intensive tab, pages and scroll after login %s without inheriting private rows',
  async (outcome) => {
    ports.owner = ''
    const page = await open(0)
    ports.request.mockImplementation(async (path: string) => ({
      items: [{ id: `${ports.owner || 'guest'}:${path}` }],
      total: 99,
      type_published_total: 99,
      content_types_ready: true,
      page: Number(new URL(path, 'http://local').searchParams.get('page')),
      limit: 1
    }))
    await page.get('[data-tab="intensive"]').trigger('click')
    await flushPromises()
    await page.get('.scene-scroll').trigger('scrolltolower')
    await flushPromises()
    await page.get('.scene-scroll').trigger('scroll', { detail: { scrollTop: 850 } })
    loginReturn.begin('/pages/learning/index?tab=intensive')
    ports.expire?.()
    await flushPromises()
    expect(page.findAllComponents({ name: 'SceneCard' })).toHaveLength(0)
    if (outcome === 'success') {
      ports.owner = 'learner'
      loginReturn.succeed()
    } else loginReturn.resumeGuest()
    ports.show?.()
    await flushPromises()
    expect(page.get('[data-tab="intensive"]').attributes('aria-selected')).toBe('true')
    expect(page.get('.scene-scroll').attributes('scroll-top')).toBe('850')
    expect(ports.request.mock.calls.slice(-2).map(([path]) => path)).toEqual([
      '/api/mini/v1/cards?scope=uncompleted&content_type=intensive&page=1&limit=1',
      '/api/mini/v1/cards?scope=uncompleted&content_type=intensive&page=2&limit=1'
    ])
    expect(
      page
        .findAllComponents({ name: 'SceneCard' })
        .every((card) =>
          String(card.props('card').id).startsWith(outcome === 'success' ? 'learner:' : 'guest:')
        )
    ).toBe(true)
    page.unmount()
  }
)

it('uses the complete published guest count without inventing personal learning numbers', async () => {
  ports.owner = ''
  const page = await open(12)
  ports.request.mockResolvedValueOnce({
    items: [{ id: 'guest-published' }],
    total: 17,
    type_published_total: 17,
    content_types_ready: true
  })
  await page.get('[data-tab="intensive"]').trigger('click')
  await flushPromises()
  expect(page.get('.catalog-count').text()).toBe('17 张')
  expect(page.text()).not.toMatch(/已学|待学|全部学完/)
  page.unmount()
})

it('keeps the design learner summary and record entry without the extra streak row above the category tabs', async () => {
  const page = await open(2)
  expect(page.find('.learned-link').exists()).toBe(true)
  expect(page.find('.records-entry').exists()).toBe(true)
  expect(page.find('.scene-streak').exists()).toBe(false)
  page.unmount()
})

/** 建立两页可信待学后模拟在详情完成已提交但响应丢失
 * @param receipt 返回列表后原回执接口的查询行为
 * @param size 进入详情前本人当前分类的待学张数
 */
const returnAfterUnknownCompletion = async (receipt: () => Promise<unknown>, size = 2) => {
  const page = await open(2)
  let committed = false
  ports.request.mockImplementation(async (path: string, options?: { method?: string }) => {
    if (path === '/api/mini/v1/cards/last/complete' && options?.method === 'POST') {
      committed = true
      throw new ApiError('network_unknown', '完成响应未知')
    }
    if (path.startsWith('/api/mini/v1/operations/')) return receipt()
    const url = new URL(path, 'http://local'),
      index = Number(url.searchParams.get('page') || 1)
    const all =
      size === 1
        ? committed
          ? []
          : [{ id: 'last', name: '最后一张' }]
        : committed
          ? [{ id: 'first', name: '第一页' }]
          : [
              { id: 'first', name: '第一页' },
              { id: 'last', name: '最后一张' }
            ]
    const effective = Math.max(1, Math.min(index, all.length))
    return {
      items: all.slice(effective - 1, effective),
      total: all.length,
      type_published_total: 2,
      content_types_ready: true,
      page: effective,
      limit: 1
    }
  })
  ports.show?.()
  await flushPromises()
  await page.get('.scene-scroll').trigger('scrolltolower')
  await flushPromises()
  expect(page.findAllComponents({ name: 'SceneCard' })).toHaveLength(size)
  await page.get('.scene-scroll').trigger('scroll', { detail: { scrollTop: 650 } })
  ports.hide?.()
  await expect(
    operations.run('complete:last', '/api/mini/v1/cards/last/complete', 'POST', {
      version_id: 'v1'
    })
  ).rejects.toMatchObject({ code: 'network_unknown' })
  return page
}

it('queries the original committed completion before replacing a two-page list and clears its pending key', async () => {
  let finish!: (value: unknown) => void
  const page = await returnAfterUnknownCompletion(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  const before = ports.request.mock.calls.length
  ports.show?.()
  await flushPromises()
  expect(ports.request.mock.calls.slice(before).map(([path]) => path)).toEqual([
    '/api/mini/v1/operations/unknown-completion-key'
  ])
  expect(page.get('.catalog-count').text()).toBe('2 张')
  expect(page.findAllComponents({ name: 'SceneCard' })).toHaveLength(2)
  finish({ status: 'succeeded', result: { first_completion: true } })
  await flushPromises()
  expect(operations.pending('complete:last')).toBe(false)
  expect(page.get('.catalog-count').text()).toBe('1 张')
  expect(
    page.findAllComponents({ name: 'SceneCard' }).map((card) => card.props('card').id)
  ).toEqual(['first'])
  expect(page.get('.scene-scroll').attributes('scroll-top')).toBe('650')
  page.unmount()
})

it.each(['unknown', 'failure'])(
  'preserves the complete trusted read range and count while the original receipt remains %s',
  async (kind) => {
    let resolved = false
    const page = await returnAfterUnknownCompletion(async () => {
      if (resolved) return { status: 'succeeded', result: { first_completion: true } }
      throw new ApiError(
        kind === 'unknown' ? 'operation_unknown' : 'network_unknown',
        kind === 'unknown' ? '仍未查询到回执' : '查询连接中断',
        kind === 'unknown' ? 404 : 0
      )
    })
    const before = ports.request.mock.calls.length
    ports.show?.()
    await flushPromises()
    expect(operations.pending('complete:last')).toBe(true)
    expect(page.get('.catalog-count').text()).toBe('2 张')
    expect(page.findAllComponents({ name: 'SceneCard' })).toHaveLength(2)
    expect(page.text()).not.toContain('本类词汇已全部学完')
    expect(page.get('.completion-recovery').text()).toContain('查询并重试原完成操作')
    expect(
      ports.request.mock.calls
        .slice(before)
        .every(([path, options]) => path.startsWith('/api/mini/v1/operations/') && !options?.method)
    ).toBe(true)
    resolved = true
    await page.get('.completion-recovery button').trigger('click')
    await flushPromises()
    expect(operations.pending('complete:last')).toBe(false)
    expect(page.get('.catalog-count').text()).toBe('1 张')
    expect(
      ports.request.mock.calls.filter(([, options]) => options?.method === 'POST')
    ).toHaveLength(1)
    page.unmount()
  }
)

it('does not accept an old tab snapshot while its receipt query completes after a tab switch', async () => {
  let finish!: (value: unknown) => void
  const page = await returnAfterUnknownCompletion(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  ports.show?.()
  await flushPromises()
  expect(
    ports.request.mock.calls.some(
      ([path]) => path === '/api/mini/v1/operations/unknown-completion-key'
    )
  ).toBe(true)
  await page.get('[data-tab="intensive"]').trigger('click')
  await flushPromises()
  finish({ status: 'succeeded', result: { first_completion: true } })
  await flushPromises()
  expect(page.get('[data-tab="intensive"]').attributes('aria-selected')).toBe('true')
  expect(page.get('.scene-scroll').attributes('scroll-top')).toBe('0')
  expect(operations.pending('complete:last')).toBe(false)
  expect(
    ports.request.mock.calls.filter(([path]) => path.includes('/cards?')).at(-1)?.[0]
  ).toContain('content_type=intensive')
  page.unmount()
})

it('keeps a new account pending completion and list isolated from an old account receipt', async () => {
  let finish!: (value: unknown) => void
  const page = await returnAfterUnknownCompletion(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  ports.show?.()
  await flushPromises()
  expect(
    ports.request.mock.calls.some(
      ([path]) => path === '/api/mini/v1/operations/unknown-completion-key'
    )
  ).toBe(true)
  ports.owner = 'owner-b'
  ports.request.mockRejectedValueOnce(new ApiError('network_unknown', 'B完成响应未知'))
  await expect(
    operations.run('complete:last', '/api/mini/v1/cards/last/complete', 'POST', {
      version_id: 'v2'
    })
  ).rejects.toMatchObject({ code: 'network_unknown' })
  ports.request.mockImplementation(async (path: string) => {
    if (path.startsWith('/api/mini/v1/operations/'))
      throw new ApiError('operation_unknown', 'B仍未知', 404)
    return {
      items: [{ id: 'b-only' }],
      total: 1,
      type_published_total: 1,
      content_types_ready: true,
      page: 1,
      limit: 1
    }
  })
  ports.show?.()
  await flushPromises()
  finish({ status: 'succeeded', result: { first_completion: true } })
  await flushPromises()
  expect(operations.pending('complete:last')).toBe(true)
  expect(page.findAllComponents({ name: 'SceneCard' })).toHaveLength(0)
  expect(page.find('.catalog-count').exists()).toBe(false)
  expect(page.get('.completion-recovery').text()).toContain('查询并重试原完成操作')
  page.unmount()
})

it('shows all learned only after the original last-card receipt has been confirmed and consumed', async () => {
  let finish!: (value: unknown) => void
  const page = await returnAfterUnknownCompletion(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
    1
  )
  ports.show?.()
  await flushPromises()
  expect(
    ports.request.mock.calls.some(
      ([path]) => path === '/api/mini/v1/operations/unknown-completion-key'
    )
  ).toBe(true)
  expect(page.get('.catalog-count').text()).toBe('1 张')
  expect(page.text()).not.toContain('本类词汇已全部学完')
  finish({ status: 'succeeded', result: { first_completion: true } })
  await flushPromises()
  expect(operations.pending('complete:last')).toBe(false)
  expect(page.get('.catalog-count').text()).toBe('0 张')
  expect(page.text()).toContain('本类词汇已全部学完')
  expect(page.find('.completion-recovery').exists()).toBe(false)
  page.unmount()
})

it('rechecks a second completion added while a shared receipt query is still in flight', async () => {
  let finish!: (value: unknown) => void
  const page = await returnAfterUnknownCompletion(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  const before = ports.request.mock.calls.length
  ports.show?.()
  await flushPromises()
  expect(
    ports.request.mock.calls.some(
      ([path]) => path === '/api/mini/v1/operations/unknown-completion-key'
    )
  ).toBe(true)
  ports.hide?.()
  ports.request.mockRejectedValueOnce(new ApiError('network_unknown', '另一张完成响应未知'))
  await expect(
    operations.run('complete:another', '/api/mini/v1/cards/another/complete', 'POST', {
      version_id: 'v2'
    })
  ).rejects.toMatchObject({ code: 'network_unknown' })
  ports.show?.()
  await flushPromises()
  finish({ status: 'succeeded', result: { first_completion: true } })
  await flushPromises()
  expect(operations.pending('complete:last')).toBe(false)
  expect(operations.pending('complete:another')).toBe(true)
  expect(
    ports.request.mock.calls
      .slice(before)
      .filter(([path]) => path.startsWith('/api/mini/v1/operations/'))
      .map(([path]) => path)
  ).toEqual([
    '/api/mini/v1/operations/unknown-completion-key',
    '/api/mini/v1/operations/unknown-completion-key-2'
  ])
  expect(page.get('.catalog-count').text()).toBe('2 张')
  finish({ status: 'succeeded', result: { first_completion: true } })
  await flushPromises()
  expect(operations.pending('complete:another')).toBe(false)
  expect(page.get('.catalog-count').text()).toBe('1 张')
  page.unmount()
})

it.each(['delivered', 'unsent', 'legacy', 'changed', 'offline', 'switched'])(
  'recovers a cold completion from storage through the learning page (%s)',
  async (scenario) => {
    const action = 'complete:old',
      key = 'previous-process-key',
      path = '/api/mini/v1/cards/old/complete',
      body = { version_id: 'original-v1' },
      lookup = '/api/mini/v1/operations/' + key,
      missing = new ApiError('operation_unknown', '查无回执', 404)
    ports.stored.set(OPERATIONS_STORAGE_PREFIX + ports.owner, [
      {
        action,
        key,
        path,
        method: 'POST',
        ...(scenario === 'legacy'
          ? {}
          : { frozenRequest: JSON.stringify({ path, method: 'POST', body }) })
      }
    ])
    if (scenario === 'delivered') {
      ports.request.mockResolvedValueOnce({
        status: 'succeeded',
        result: { first_completion: true }
      })
    } else ports.request.mockRejectedValueOnce(missing)
    const page = await open(1)
    try {
      if (scenario === 'delivered') {
        expect(operations.pending(action)).toBe(false)
        expect(ports.request.mock.calls.filter(([url]) => url === lookup)).toHaveLength(1)
        expect(ports.request.mock.calls.filter(([, opts]) => opts?.method === 'POST')).toHaveLength(
          0
        )
        return
      }
      expect(page.find('.catalog-count').exists()).toBe(false)
      ports.request.mockRejectedValueOnce(missing)
      await page.get('[data-tab="intensive"]').trigger('click')
      await flushPromises()
      expect(ports.request.mock.calls.map(([url]) => url)).toEqual([lookup, lookup])
      ports.request.mockImplementation(async (url: string) => {
        if (url === lookup) {
          if (scenario === 'switched') ports.owner = 'second-owner'
          throw missing
        }
        if (url === path) {
          if (scenario === 'offline') throw new ApiError('network_unknown', '网络中断')
          if (scenario === 'changed')
            throw new ApiError('version_changed', '内容已更新，请重新学习', 409)
          return { first_completion: true }
        }
        return {
          items: [{ id: 'old', version_id: 'new-v2' }],
          total: 1,
          type_published_total: 1,
          content_types_ready: true
        }
      })
      await page.get('.completion-recovery button').trigger('click')
      await flushPromises()
      const calls = ports.request.mock.calls.slice(2),
        shouldReplay = !['legacy', 'switched'].includes(scenario)
      expect(calls[0]).toEqual([lookup])
      expect(calls.filter(([, opts]) => opts?.method === 'POST')).toEqual(
        shouldReplay ? [[path, { method: 'POST', key, body }]] : []
      )
      if (scenario === 'switched') {
        expect(operations.pending(action)).toBe(false)
        ports.owner = 'owner'
      }
      const uncertain = ['offline', 'switched'].includes(scenario)
      expect(operations.pending(action)).toBe(uncertain)
      expect(calls.some(([url]) => url.includes('content_type=intensive'))).toBe(!uncertain)
      if (scenario === 'legacy') expect(page.text()).toContain('原版本')
      if (scenario === 'changed') expect(page.text()).toContain('内容已更新')
    } finally {
      page.unmount()
    }
  }
)
