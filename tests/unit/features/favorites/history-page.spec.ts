// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'

import HistoryPage from '@/sub-packages/favorites/history.vue'

const dependencies = vi.hoisted(() => ({
  load: undefined as ((query: Record<string, string>) => unknown) | undefined,
  show: undefined as (() => unknown) | undefined,
  hide: undefined as (() => unknown) | undefined,
  unload: undefined as (() => unknown) | undefined,
  session: { cleanupGeneration: 0 },
  get: vi.fn(),
  catalog: vi.fn()
}))
vi.mock('@dcloudio/uni-app', () => ({
  onLoad: (hook: typeof dependencies.load) => {
    dependencies.load = hook
  },
  onShow: (hook: typeof dependencies.show) => {
    dependencies.show = hook
  },
  onHide: (hook: typeof dependencies.hide) => {
    dependencies.hide = hook
  },
  onUnload: (hook: typeof dependencies.unload) => {
    dependencies.unload = hook
  }
}))
vi.mock('@/services/analytics/use-analytics-page', () => ({ useAnalyticsPage: vi.fn() }))
vi.mock('@/stores/session', () => ({ useSessionStore: () => dependencies.session }))
vi.mock('@/services/runtime', () => ({
  getRuntimeServices: () => ({
    client: { get: dependencies.get },
    catalog: { getCatalog: dependencies.catalog }
  })
}))
const history = {
  items: ['open', 'formal'].map((scene_id) => ({
    scene_id,
    scene_title: `历史${scene_id}`,
    source_type: scene_id === 'open' ? 'OPEN' : 'SCENE',
    completed_at: null,
    last_learned_at: ''
  }))
}
const render = () =>
  mount(HistoryPage, {
    global: {
      stubs: {
        PersonalPage: { template: '<div><slot /><slot name="actions" /></div>' },
        PersonalSummary: true,
        PersonalRow: { props: ['title'], template: '<p>{{ title }}</p>' },
        AppState: true,
        AppButton: true
      }
    }
  })
beforeEach(() => {
  vi.clearAllMocks()
  dependencies.session = reactive({ cleanupGeneration: 0 })
  dependencies.get.mockResolvedValue(history)
  dependencies.catalog.mockResolvedValue({ items: [], authorization_pending: false })
})
describe('历史页面筛选与请求失效', () => {
  it('消费开放复习路由filter，普通历史仍保留全部记录', async () => {
    const wrapper = render()
    dependencies.load?.({ filter: 'open' })
    await dependencies.show?.()
    expect(wrapper.text()).toContain('历史open')
    expect(wrapper.text()).not.toContain('历史formal')
    dependencies.load?.({})
    await dependencies.show?.()
    expect(wrapper.text()).toContain('历史formal')
    wrapper.unmount()
  })
  it.each(['hide', 'unload', 'cleanup'] as const)('%s之后迟到历史不能写回', async (event) => {
    let finish!: (value: typeof history) => void
    dependencies.get.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    const wrapper = render()
    dependencies.load?.({ filter: 'open' })
    const showing = dependencies.show?.()
    if (event === 'cleanup') dependencies.session.cleanupGeneration++
    else dependencies[event]?.()
    finish(history)
    await showing
    await flushPromises()
    expect(wrapper.text()).not.toContain('历史open')
    wrapper.unmount()
  })
  it('清空学习或登出时立即移除已显示历史摘要', async () => {
    const wrapper = render()
    dependencies.load?.({})
    await dependencies.show?.()
    expect(wrapper.text()).toContain('历史open')
    dependencies.session.cleanupGeneration++
    await flushPromises()
    expect(wrapper.text()).not.toContain('历史open')
    wrapper.unmount()
  })
})
