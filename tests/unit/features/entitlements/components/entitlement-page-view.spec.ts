// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import EntitlementPageView from '@/features/entitlements/components/entitlement-page-view.vue'

import type { EntitlementsResponse, LimitedEntitlement } from '@/shared/contracts/entitlements'

const dependencies = vi.hoisted(() => ({
  show: undefined as (() => Promise<void>) | undefined,
  hide: undefined as (() => void) | undefined,
  get: vi.fn(),
  catalog: vi.fn(),
  navigate: vi.fn()
}))
const analytics = vi.hoisted(() => ({ capture: () => 1, track: vi.fn() }))
vi.mock('@/services/analytics/runtime', () => ({ getAnalytics: () => analytics }))
vi.mock('@dcloudio/uni-app', () => ({
  onHide: (hook: () => void) => {
    dependencies.hide = hook
  },
  onUnload: (hook: () => void) => {
    dependencies.hide = hook
  },
  onLoad: (hook: (query: Record<string, string>) => void) => hook({ id: 'one' }),
  onShow: (hook: () => Promise<void>) => {
    dependencies.show = hook
  }
}))
vi.mock('@/services/runtime', () => ({
  getRuntimeServices: () => ({
    entitlements: { get: dependencies.get },
    catalog: { getCatalog: dependencies.catalog }
  })
}))
vi.mock('@/shared/navigation/navigate', () => ({ navigate: dependencies.navigate }))

const limited: LimitedEntitlement = {
  activated_at: null,
  activity_id: 'activity',
  duration_days: 3,
  expires_at: null,
  id: 'one',
  scene_count: 1,
  scene_ids: ['scene-1'],
  starts_before: '2026-10-20T08:00:00Z',
  status: 'PENDING',
  title: '限时活动'
}
/** 设置服务端权益响应，item 为被选中的权益，pending 为授权待确认标识 */
const respond = (item: LimitedEntitlement, pending = false) => {
  const response: EntitlementsResponse = {
    server_now: '2026-10-09T08:00:00Z',
    authorization_pending: pending,
    formal: [],
    limited: [item],
    version: 'v1'
  }
  dependencies.get.mockResolvedValue(response)
}
/** 挂载权益页面，state 为当前路由展示状态 */
const render = async (state: 'ALL' | 'PENDING' | 'ACTIVE' | 'ENDING' | 'ENDED' | 'EXCEPTION') => {
  const wrapper = mount(EntitlementPageView, {
    props: { state },
    global: { stubs: { TabPageLayout: { template: '<div><slot /></div>' }, PageHeader: true } }
  })
  await dependencies.show?.()
  await flushPromises()
  return wrapper
}
beforeEach(() => {
  vi.clearAllMocks()
  dependencies.catalog.mockResolvedValue({
    authorization_pending: false,
    items: [
      {
        access: 'LIMITED',
        chinese_title: '场景',
        progress: 0,
        scene_id: 'scene-1',
        series: '系列',
        tags: [],
        title: 'Scene'
      }
    ]
  })
  respond(limited)
})
afterEach(() => vi.restoreAllMocks())

describe('权益页面状态映射与导航', () => {
  it.each([
    ['ACTIVE', '2026-10-12T08:00:00Z', '结束时间', '按服务端时间计算，进度和收藏会保留'],
    ['ENDING', '2026-10-09T20:00:00Z', '学习权益将于', '收藏和学习进度会继续保留。']
  ] as const)('%s 页面展示对应期限说明并进入目录', async (state, expiresAt, label, note) => {
    respond({
      ...limited,
      status: 'ACTIVE',
      activated_at: '2026-10-08T08:00:00Z',
      expires_at: expiresAt
    })
    const wrapper = await render(state)
    expect(wrapper.get('.summary-label').text()).toBe(label)
    expect(wrapper.get('.summary-note').text()).toBe(note)
    expect(wrapper.text()).toContain('尚未开始')
    await wrapper.get('.page-actions button').trigger('click')
    expect(dependencies.navigate).toHaveBeenCalledWith({
      type: 'reLaunch',
      url: '/pages/learning/index'
    })
    wrapper.unmount()
  })
  it('权益列表区分待开始、学习中、结束和未知异常状态', async () => {
    dependencies.get.mockResolvedValue({
      server_now: '2026-10-09T08:00:00Z',
      authorization_pending: false,
      formal: [],
      version: 'v1',
      limited: [
        limited,
        {
          ...limited,
          id: 'active',
          status: 'ACTIVE',
          activated_at: '2026-10-08T08:00:00Z',
          expires_at: '2026-10-12T08:00:00Z'
        },
        {
          ...limited,
          id: 'ending',
          status: 'ACTIVE',
          activated_at: '2026-10-08T08:00:00Z',
          expires_at: '2026-10-09T20:00:00Z'
        },
        { ...limited, id: 'ended', status: 'ENDED' },
        { ...limited, id: 'exception', status: 'FUTURE_STATUS' }
      ]
    })
    const wrapper = await render('ALL')
    expect(
      wrapper
        .findAll('.row-badge')
        .slice(0, 5)
        .map((badge) => badge.text())
    ).toEqual(['待开始', '学习中', '学习中', '已结束', '暂不可用'])
    wrapper.unmount()
  })
  it.each([
    ['PAUSED', '已暂停'],
    ['REVOKED', '已撤销'],
    ['START_EXPIRED', '已过启动截止'],
    ['FUTURE_STATUS', '暂不可用'],
    ['toString', '暂不可用']
  ])('异常服务端状态 %s 保留对应提示与未知值回退', async (status, label) => {
    respond({ ...limited, status })
    const wrapper = await render('EXCEPTION')
    expect(wrapper.get('.summary-value').text()).toBe(label)
    respond({ ...limited, status }, true)
    await dependencies.show?.()
    await flushPromises()
    expect(wrapper.get('.summary-value').text()).toBe('待确认')
    wrapper.unmount()
  })
  it('待开始页面点击主按钮进入场景，期限和天数随刷新更新', async () => {
    const wrapper = await render('PENDING')
    expect(analytics.track).toHaveBeenCalledWith(
      'entitlement_view',
      { access_level: 'PENDING' },
      { token: 1 }
    )
    expect(wrapper.get('.summary-label').text()).toBe('启动截止')
    expect(wrapper.get('.page-subtitle').text()).toContain('3 天活动')
    expect(wrapper.text()).toContain('3 天活动场景之一')
    await wrapper.get('.page-actions button').trigger('click')
    expect(dependencies.navigate).toHaveBeenCalledWith({
      type: 'navigateTo',
      url: '/sub-packages/scene/detail?sceneId=scene-1'
    })
    respond({ ...limited, duration_days: 5 })
    await dependencies.show?.()
    await flushPromises()
    expect(wrapper.get('.page-subtitle').text()).toContain('5 天活动')
    wrapper.unmount()
  })
  it('待开始但没有场景时主按钮回到学习目录', async () => {
    respond({ ...limited, scene_ids: [] })
    const wrapper = await render('PENDING')
    await wrapper.get('.page-actions button').trigger('click')
    expect(dependencies.navigate).toHaveBeenCalledWith({
      type: 'reLaunch',
      url: '/pages/learning/index'
    })
    wrapper.unmount()
  })
  it('已结束页面保留零值成果并进入学习历史', async () => {
    respond({
      ...limited,
      status: 'ENDED',
      achievements: {
        completed_scenes: 0,
        learning_days: 0,
        favorite_vocabulary: 0,
        favorite_phrases: 2
      }
    })
    const wrapper = await render('ENDED')
    expect(wrapper.get('.summary-value').text()).toBe('0 天')
    expect(wrapper.text()).toContain('0 条 · 进入词汇银行')
    expect(wrapper.text()).toContain('2 条 · 进入语块银行')
    await wrapper.get('.page-actions button').trigger('click')
    expect(dependencies.navigate).toHaveBeenCalledWith({
      type: 'navigateTo',
      url: '/sub-packages/favorites/history'
    })
    wrapper.unmount()
  })
})
