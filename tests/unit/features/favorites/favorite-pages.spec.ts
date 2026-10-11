// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'

import { useFavoriteStore } from '@/stores/favorites'
import FavoriteDetail from '@/sub-packages/favorites/detail.vue'
import FavoriteSources from '@/sub-packages/favorites/sources.vue'

import type { FavoriteItem } from '@/shared/contracts/favorites'
vi.mock('@/services/analytics/use-analytics-page', () => ({ useAnalyticsPage: vi.fn() }))

const dependencies = vi.hoisted(() => ({
  load: undefined as ((query: Record<string, string>) => unknown) | undefined,
  show: undefined as (() => unknown) | undefined,
  hide: [] as (() => unknown)[],
  unload: [] as (() => unknown)[],
  get: vi.fn(),
  resolve: vi.fn(),
  remove: vi.fn(),
  back: vi.fn(),
  navigate: vi.fn(),
  session: { cleanupGeneration: 0 }
}))
vi.mock('@/stores/session', () => ({ useSessionStore: () => dependencies.session }))
vi.mock('@dcloudio/uni-app', () => ({
  onLoad: (callback: typeof dependencies.load) => {
    dependencies.load = callback
  },
  onShow: (callback: typeof dependencies.show) => {
    dependencies.show = callback
  },
  onHide: (callback: () => unknown) => {
    dependencies.hide.push(callback)
  },
  onUnload: (callback: () => unknown) => {
    dependencies.unload.push(callback)
  }
}))
vi.mock('@/services/runtime', () => ({
  getRuntimeServices: () => ({
    favorites: {
      get: dependencies.get,
      resolveSource: dependencies.resolve,
      remove: dependencies.remove,
      list: async () => ({ items: [], has_more: false, next_cursor: null })
    }
  })
}))
vi.mock('@/stores/audio', () => ({ useAudioStore: () => ({ snapshot: { status: 'IDLE' } }) }))
vi.mock('@/shared/navigation/navigate', () => ({ navigate: dependencies.navigate }))
/** 创建可撤销原文权限的收藏响应，allowed 为服务端当前访问能力 */
const favorite = (allowed: boolean): FavoriteItem => ({
  id: 'one',
  entry_stable_id: 'entry-one',
  entry_type: 'VOCABULARY',
  normalized_key: 'latte',
  favorited_at: '',
  last_reviewed_at: null,
  sources: [
    {
      scene_id: 'cafe',
      source_locator: 's1',
      revision_id: 'r1',
      entry_version: 1,
      original_link: allowed ? '/source' : null,
      sentence_snapshot: 'Could I get a latte?'
    }
  ]
})
const options = {
  global: {
    stubs: {
      PersonalPage: { template: '<div><slot /><slot name="actions" /></div>' },
      AudioButton: true
    }
  }
}
beforeEach(() => {
  setActivePinia(createPinia())
  vi.resetAllMocks()
  dependencies.load = undefined
  dependencies.show = undefined
  dependencies.hide = []
  dependencies.unload = []
  dependencies.session = reactive({ cleanupGeneration: 0 })
  vi.stubGlobal('uni', { showToast: vi.fn(), navigateBack: dependencies.back })
})
afterEach(() => vi.unstubAllGlobals())
it('原文解析在途取消失败后仍可重新解析，不保留已失效请求的加载状态', async () => {
  let finish!: (value: unknown) => void
  dependencies.get.mockResolvedValue(favorite(true))
  dependencies.resolve.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  dependencies.remove.mockRejectedValueOnce(new Error('offline'))
  const wrapper = mount(FavoriteDetail, options)
  await dependencies.load?.({ id: 'one' })
  await dependencies.show?.()
  const source = () => wrapper.find('button.app-button')
  await source().trigger('click')
  await wrapper
    .findAll('button')
    .find((button) => button.text().includes('收藏状态'))!
    .trigger('click')
  await flushPromises()
  finish({
    status: 'NO_ACCESS',
    content_type: 'dialogue',
    content_id: 'cafe',
    target_content_version: null,
    saved_content_version: 1,
    safe_summary: {}
  })
  await flushPromises()
  expect(source().attributes('aria-disabled')).toBe('false')
  dependencies.resolve.mockResolvedValue({
    status: 'NO_ACCESS',
    content_type: 'dialogue',
    content_id: 'cafe',
    target_content_version: null,
    saved_content_version: 1,
    safe_summary: {}
  })
  await source().trigger('click')
  await flushPromises()
  expect(dependencies.resolve).toHaveBeenCalledTimes(2)
  wrapper.unmount()
})
it('详情取消在途离页后不能用旧响应返回当前新页面', async () => {
  let finish!: (value: unknown) => void
  dependencies.get.mockResolvedValue(favorite(true))
  dependencies.remove.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  const wrapper = mount(FavoriteDetail, options)
  await dependencies.load?.({ id: 'one' })
  await dependencies.show?.()
  await wrapper
    .findAll('button')
    .find((button) => button.text().includes('收藏状态'))!
    .trigger('click')
  dependencies.hide.forEach((callback) => callback())
  finish({ favorite_id: 'one', active: false })
  await flushPromises()
  expect(dependencies.back).not.toHaveBeenCalled()
  wrapper.unmount()
})
describe.each([
  { name: '详情', component: FavoriteDetail },
  { name: '来源', component: FavoriteSources }
])('收藏$name页最新权限', ({ component }) => {
  it('详情读取期间同账号取消成功，迟到旧GET不能恢复卡片或银行', async () => {
    let finish!: (value: FavoriteItem) => void
    dependencies.get.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    const wrapper = mount(component, options)
    await dependencies.load?.({ id: 'one' })
    const showing = dependencies.show?.()
    await useFavoriteStore().remove('one', {
      remove: async () => ({ favorite_id: 'one', active: false, snapshot_version: 1 })
    } as never)
    finish(favorite(true))
    await showing
    await flushPromises()
    expect(wrapper.text()).not.toContain('Could I get a latte?')
    expect(useFavoriteStore().items).toEqual([])
    wrapper.unmount()
  })
  it('离页再进入同一收藏后，旧EXACT原文响应不能覆盖本次页面权限', async () => {
    let finish!: (value: unknown) => void
    dependencies.get.mockResolvedValue(favorite(true))
    dependencies.resolve.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    const wrapper = mount(component, options)
    await dependencies.load?.({ id: 'one' })
    await dependencies.show?.()
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '返回原文')!
      .trigger('click')
    dependencies.hide.forEach((callback) => callback())
    await dependencies.show?.()
    finish({
      status: 'EXACT',
      content_type: 'dialogue',
      content_id: 'cafe',
      saved_content_version: 1,
      target_content_version: 2,
      locator: { sentence_id: 'current' },
      safe_summary: {}
    })
    await flushPromises()
    expect(dependencies.navigate).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Could I get a latte?')
    wrapper.unmount()
  })
  it('清空期间迟到详情不能恢复页面或重新灌入收藏store', async () => {
    let finish!: (item: FavoriteItem) => void
    dependencies.get.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    const wrapper = mount(component, options)
    await dependencies.load?.({ id: 'one' })
    const showing = dependencies.show?.()
    dependencies.session.cleanupGeneration++
    useFavoriteStore().clear()
    finish(favorite(true))
    await showing
    await flushPromises()
    expect(wrapper.text()).not.toContain('Could I get a latte?')
    expect(useFavoriteStore().items).toEqual([])
    wrapper.unmount()
  })
  it('返回页面后重新读取权限，刷新失败也不能沿用旧正文入口', async () => {
    dependencies.get.mockResolvedValue(favorite(true))
    const wrapper = mount(component, options)
    await dependencies.load?.({ id: 'one' })
    await dependencies.show?.()
    await flushPromises()
    expect(wrapper.text()).toContain('Could I get a latte?')
    dependencies.hide.forEach((callback) => callback())
    dependencies.get.mockResolvedValue(favorite(false))
    await dependencies.show?.()
    await flushPromises()
    dependencies.resolve.mockResolvedValue({
      content_type: 'dialogue',
      content_id: 'cafe',
      saved_content_version: 1,
      target_content_version: null,
      status: 'NO_ACCESS',
      locator: null,
      safe_summary: { title: '咖啡店' }
    })
    {
      await wrapper
        .findAll('button')
        .find((button) => button.text() === '返回原文')
        ?.trigger('click')
      await flushPromises()
      expect(dependencies.resolve).toHaveBeenCalledWith('one')
      expect(dependencies.navigate).not.toHaveBeenCalled()
      expect(wrapper.text()).toContain('当前无原文访问权限')
    }
    dependencies.hide.forEach((callback) => callback())
    dependencies.get.mockRejectedValue(new Error('offline'))
    await dependencies.show?.()
    await flushPromises()
    expect(wrapper.text()).not.toContain('Could I get a latte?')
    wrapper.unmount()
  })
  it.each(['hide', 'unload'] as const)('%s后迟到响应不能恢复旧来源和动作', async (leave) => {
    let finish!: (item: FavoriteItem) => void
    dependencies.get.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    const wrapper = mount(component, options)
    const loading = dependencies.load?.({ id: 'one' })
    const showing = dependencies.show?.()
    dependencies[leave].forEach((callback) => callback())
    finish(favorite(true))
    await loading
    await showing
    await flushPromises()
    expect(wrapper.text()).not.toContain('Could I get a latte?')
    wrapper.unmount()
  })
})
