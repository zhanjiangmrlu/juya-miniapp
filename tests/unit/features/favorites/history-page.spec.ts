// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'

import HistoryPage from '@/sub-packages/favorites/history.vue'

import type { components } from '../../../fixtures/contracts/v15-a9a97b8/provider'

const dependencies = vi.hoisted(() => ({
  load: undefined as ((query: Record<string, string>) => unknown) | undefined,
  show: undefined as (() => unknown) | undefined,
  hide: undefined as (() => unknown) | undefined,
  unload: undefined as (() => unknown) | undefined,
  session: { cleanupGeneration: 0, isAuthenticated: true, profile: { juya_id: 'one' } },
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
    position: { entry_id: 'sentence-one', offset: 0 },
    client_sequence: 1,
    started_at: '2026-10-11T00:00:00Z',
    completed_at: null,
    last_learned_at: ''
  })),
  has_more: false,
  next_cursor: null
} satisfies components['schemas']['SceneHistoryPageResponse']
const render = () =>
  mount(HistoryPage, {
    global: {
      stubs: {
        PersonalPage: { template: '<div><slot /><slot name="actions" /></div>' },
        PersonalSummary: true,
        PersonalRow: { props: ['title'], template: '<p>{{ title }}</p>' },
        AppState: true,
        AppButton: {
          props: ['label'],
          emits: ['press'],
          template: '<button @click="$emit(\'press\')">{{label}}</button>'
        }
      }
    }
  })
beforeEach(() => {
  vi.resetAllMocks()
  dependencies.session = reactive({
    cleanupGeneration: 0,
    isAuthenticated: true,
    profile: { juya_id: 'one' }
  })
  dependencies.get.mockResolvedValue(history)
  dependencies.catalog.mockResolvedValue({ items: [], authorization_pending: false })
})
describe('历史页面筛选与请求失效', () => {
  it('可见页首次账号确认重读，先前账号迟到分页不覆盖新记录', async () => {
    dependencies.session.profile.juya_id = ''
    let finish!: (value: unknown) => void
    dependencies.get.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    const wrapper = render()
    const showing = dependencies.show?.()
    dependencies.session.profile.juya_id = 'confirmed'
    await flushPromises()
    expect(dependencies.get).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('历史open')
    finish({ items: [], has_more: false, next_cursor: null })
    await showing
    expect(wrapper.text()).toContain('历史open')
    wrapper.unmount()
  })
  it('按a9a97b8游标读取完整场景历史后再筛选开放记录，不限首屏', async () => {
    dependencies.get
      .mockResolvedValueOnce({
        items: [history.items[1]],
        has_more: true,
        next_cursor: 'history+next'
      })
      .mockResolvedValueOnce({ items: [history.items[0]], has_more: false, next_cursor: null })
    const wrapper = render()
    dependencies.load?.({ filter: 'open' })
    await dependencies.show?.()
    expect(dependencies.get).toHaveBeenCalledTimes(2)
    expect(dependencies.get).toHaveBeenLastCalledWith(
      '/api/v1/history/scenes?cursor=history%2Bnext'
    )
    expect(wrapper.text()).toContain('历史open')
    expect(wrapper.text()).not.toContain('历史formal')
    wrapper.unmount()
  })
  it('分页失败不把部分记录当完整历史，重新加载从首屏开始', async () => {
    dependencies.get
      .mockResolvedValueOnce({ items: [history.items[0]], has_more: true, next_cursor: 'next' })
      .mockRejectedValueOnce(new Error('offline'))
    const wrapper = render()
    dependencies.load?.({})
    await dependencies.show?.()
    expect(wrapper.text()).not.toContain('历史open')
    expect(wrapper.text()).toContain('学习记录加载失败')
    dependencies.get.mockResolvedValueOnce(history)
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '重新加载')!
      .trigger('click')
    await flushPromises()
    expect(dependencies.get.mock.calls[2]).toEqual(['/api/v1/history/scenes'])
    expect(wrapper.text()).toContain('历史open')
    wrapper.unmount()
  })
  it('服务端游标重复时停止继续拉取并提示重新加载', async () => {
    dependencies.get.mockResolvedValue({
      items: history.items,
      has_more: true,
      next_cursor: 'loop'
    })
    const wrapper = render()
    dependencies.load?.({})
    await dependencies.show?.()
    expect(dependencies.get).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('历史分页位置已失效')
    expect(wrapper.text()).not.toContain('历史open')
    wrapper.unmount()
  })
  it('第二页在途清理账号后不请求后续页或写回任何摘要', async () => {
    let finish!: (value: unknown) => void
    dependencies.get
      .mockResolvedValueOnce({ items: [history.items[0]], has_more: true, next_cursor: 'page2' })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve
          })
      )
    const wrapper = render()
    dependencies.load?.({})
    const showing = dependencies.show?.()
    await flushPromises()
    dependencies.session.cleanupGeneration++
    finish({ items: [history.items[1]], has_more: true, next_cursor: 'page3' })
    await showing
    expect(dependencies.get).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).not.toContain('历史open')
    wrapper.unmount()
  })
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
