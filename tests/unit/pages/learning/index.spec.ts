// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import LearningPage from '@/pages/learning/index.vue'
import { getRuntimeServices } from '@/services/runtime'
import { useLearningStore } from '@/stores/learning'

import type { LearningCatalogResponse, LearningModule } from '@/shared/contracts/learning'

const fixture = vi.hoisted(() => ({
  modules: [] as LearningModule[],
  catalog: {
    user_stage: 'NEW',
    authorization_pending: false,
    items: []
  } as LearningCatalogResponse,
  failure: false,
  destinations: [] as string[]
}))
vi.mock('@dcloudio/uni-app', () => ({ onShow: vi.fn(), onHide: vi.fn(), onUnload: vi.fn() }))
vi.mock('@/services/runtime', () => ({
  getRuntimeServices: () => ({
    catalog: {
      getModules: async () => ({ items: fixture.modules }),
      getCatalog: async () => {
        if (fixture.failure) throw new Error('network unavailable')
        return fixture.catalog
      }
    }
  })
}))

const openScene = {
  access: 'OPEN' as const,
  scene_id: 'current-scene',
  chinese_title: '真实开放场景',
  title: 'Current scene',
  series: '日常英语',
  tags: []
}

beforeEach(() => {
  setActivePinia(createPinia())
  fixture.modules = [
    { enabled: true, key: 'scene_learning', public_id: 'scene-module', title: '场景学习' },
    { enabled: true, key: 'short_reading', public_id: 'reading-module', title: '短文阅读' }
  ]
  fixture.catalog = { user_stage: 'NEW', authorization_pending: false, items: [] }
  fixture.failure = false
  fixture.destinations = []
  vi.stubGlobal('uni', {
    getStorageSync: () => undefined,
    /** 记录实际页面跳转，options 包含平台路由和成功回调 */
    navigateTo: (options: { url: string; success: () => void }) => {
      fixture.destinations.push(options.url)
      options.success()
    }
  })
})
afterEach(() => vi.unstubAllGlobals())

/** 挂载真实学习页，仅替换不影响目录内容的外层布局 */
const mountPage = () =>
  mount(LearningPage, {
    global: {
      stubs: { 'page-meta': true, EntryPageShell: { template: '<div><slot /></div>' } }
    }
  })

/** 将当前接口响应交给真实学习 store 加载 */
const loadCatalog = () => useLearningStore().load(getRuntimeServices().catalog)

describe('学习页目录状态', () => {
  it.each(['NEW', 'ENTITLED'] as const)('阶段%s的合法空目录有说明且保留内容入口', async (stage) => {
    fixture.catalog.user_stage = stage
    await loadCatalog()
    const wrapper = mountPage()

    expect(wrapper.get('[role="status"]').text()).toContain('暂无可学习的场景')
    expect(wrapper.find('.scene-card').exists()).toBe(false)
    const explore = wrapper.findAll('button').find((button) => button.text() === '探索更多内容')!
    await explore.trigger('click')
    await wrapper.get('.learning-modules button:last-child').trigger('click')
    expect(fixture.destinations).toEqual([
      '/sub-packages/learning/explore',
      '/sub-packages/short-reading/index'
    ])
    wrapper.unmount()
  })

  it('仅有预览内容时不将只读场景当作可学习内容', async () => {
    fixture.catalog.items = [{ ...openScene, access: 'PREVIEW' }]
    await loadCatalog()
    const wrapper = mountPage()

    expect(wrapper.get('[role="status"]').text()).toContain('暂无可学习的场景')
    expect(wrapper.find('.scene-card').exists()).toBe(false)
    expect(wrapper.text()).toContain('探索更多内容')
    wrapper.unmount()
  })

  it('网络请求失败显示重试，不误报权限确认或模块关闭', async () => {
    fixture.failure = true
    await loadCatalog()
    const wrapper = mountPage()

    expect(wrapper.get('[role="status"]').text()).toContain('网络')
    expect(wrapper.text()).not.toContain('正在重新确认')
    expect(wrapper.text()).not.toContain('学习内容正在调整')
    fixture.failure = false
    await wrapper.get('[role="status"] button').trigger('click')
    await vi.waitFor(() => expect(useLearningStore().error).toBe(false))
    await nextTick()
    expect(wrapper.get('[role="status"]').text()).toContain('暂无可学习的场景')
    wrapper.unmount()
  })

  it('权威阶段待确认时优先显示权限状态，即使没有模块', async () => {
    fixture.modules = []
    fixture.catalog.user_stage = null
    await loadCatalog()
    const wrapper = mountPage()

    expect(wrapper.get('[role="status"]').text()).toContain('正在重新确认')
    expect(wrapper.text()).not.toContain('学习内容正在调整')
    expect(wrapper.find('.scene-card').exists()).toBe(false)
    wrapper.unmount()
  })

  it('权限待确认不展示旧目录中的开放内容或探索入口', async () => {
    fixture.catalog = { user_stage: null, authorization_pending: true, items: [openScene] }
    await loadCatalog()
    const wrapper = mountPage()

    expect(wrapper.get('[role="status"]').text()).toContain('正在重新确认')
    expect(wrapper.find('.scene-card').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('真实开放场景')
    expect(wrapper.text()).not.toContain('探索更多内容')
    wrapper.unmount()
  })

  it('已确认关闭全部模块时保留调整说明与收藏入口', async () => {
    fixture.modules = []
    await loadCatalog()
    const wrapper = mountPage()

    expect(wrapper.get('[role="status"]').text()).toContain('学习内容正在调整')
    expect(wrapper.text()).toContain('前往收藏')
    expect(wrapper.text()).not.toContain('暂无可学习的场景')
    wrapper.unmount()
  })

  it('已有可学开放场景时展示真实卡片，不显示空说明', async () => {
    fixture.catalog.items = [openScene]
    await loadCatalog()
    const wrapper = mountPage()

    expect(wrapper.text()).toContain('真实开放场景')
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('场景模块关闭时不显示场景空说明或旧开放内容', async () => {
    fixture.modules[0]!.enabled = false
    fixture.catalog.items = [openScene]
    await loadCatalog()
    const wrapper = mountPage()

    expect(wrapper.text()).toContain('短文阅读')
    expect(wrapper.text()).not.toContain('真实开放场景')
    expect(wrapper.text()).not.toContain('暂无可学习的场景')
    wrapper.unmount()
  })

  it('目录加载期间不把暂时空数据误报为模块已关闭', async () => {
    useLearningStore().loading = true
    const wrapper = mountPage()

    expect(wrapper.get('[role="status"]').text()).toContain('正在加载')
    expect(wrapper.text()).not.toContain('学习内容正在调整')
    wrapper.unmount()
  })
})
