// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'

import ReviewPageView from '@/features/favorites/components/review-page-view.vue'
import { useFavoriteStore } from '@/stores/favorites'

import type { FavoriteItem } from '@/shared/contracts/favorites'

const dependencies = vi.hoisted(() => ({
  load: undefined as ((query: Record<string, string>) => Promise<void>) | undefined,
  hide: undefined as (() => void) | undefined,
  show: undefined as (() => Promise<void>) | undefined,
  get: vi.fn(),
  create: vi.fn(),
  list: undefined as ReturnType<typeof vi.fn> | undefined,
  complete: vi.fn(),
  track: vi.fn(),
  navigate: vi.fn(),
  session: { cleanupGeneration: 0 }
}))
vi.mock('@/stores/session', () => ({ useSessionStore: () => dependencies.session }))
vi.mock('@dcloudio/uni-app', () => ({
  onLoad: (hook: typeof dependencies.load) => {
    dependencies.load = hook
  },
  onHide: (hook: typeof dependencies.hide) => {
    dependencies.hide = hook
  },
  onUnload: vi.fn(),
  onShow: (hook: typeof dependencies.show) => {
    dependencies.show = hook
  }
}))
vi.mock('@/services/runtime', () => ({
  getRuntimeServices: () => ({
    favorites: {
      get: dependencies.get,
      list: dependencies.list,
      createReview: dependencies.create,
      completeReview: dependencies.complete
    }
  })
}))
vi.mock('@/services/analytics/runtime', () => ({
  getAnalytics: () => ({ capture: () => 1, track: dependencies.track })
}))
vi.mock('@/shared/navigation/navigate', () => ({ navigate: dependencies.navigate }))
beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
  dependencies.session = reactive({ cleanupGeneration: 0 })
  dependencies.list = undefined
  dependencies.create.mockReset()
  dependencies.complete.mockReset()
  dependencies.get.mockResolvedValue({
    id: 'card',
    entry_type: 'VOCABULARY',
    english: 'coffee',
    sources: []
  })
  dependencies.create.mockResolvedValue({ id: 'session', card_count: 1 })
})
const render = () =>
  mount(ReviewPageView, {
    props: { face: 'BACK' },
    global: {
      stubs: {
        PersonalPage: { template: '<div><slot /><slot name="actions" /></div>' },
        ReviewCard: true,
        AppState: { props: ['description'], template: '<p>{{ description }}</p>' },
        AppButton: {
          name: 'AppButton',
          props: ['label', 'loading'],
          emits: ['press'],
          template: '<button @click="$emit(\'press\')">{{ label }}</button>'
        }
      }
    }
  })
describe('复习开始与完成统计', () => {
  it('成果混合队列返回页面后保留有效词汇语块并移除已取消卡', async () => {
    const store = useFavoriteStore()
    store.items = [
      { id: 'card', active: true, entry_type: 'VOCABULARY', english: 'coffee', sources: [] },
      { id: 'phrase', active: true, entry_type: 'PHRASE', english: 'a cup of coffee', sources: [] }
    ] as unknown as FavoriteItem[]
    dependencies.create.mockImplementation(async (ids: string[]) => ({
      id: 'session',
      card_count: ids.length
    }))
    const wrapper = render()
    await dependencies.load?.({ cardIds: 'card,phrase', scope: 'ALL' })
    dependencies.hide?.()
    dependencies.list = vi.fn(async () => ({
      items: [store.items[1]],
      has_more: false,
      next_cursor: null
    }))
    dependencies.get.mockRejectedValue(new Error('removed'))
    await dependencies.show?.()
    await flushPromises()
    expect(wrapper.findComponent({ name: 'ReviewCard' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'ReviewCard' }).props('item').id).toBe('phrase')
    expect(store.tabState.VOCABULARY.review?.cardIds).toEqual(['phrase'])
    wrapper.unmount()
  })
  it('成果混合队列翻面保留全部收藏范围', async () => {
    const wrapper = render()
    await dependencies.load?.({ cardIds: 'card', scope: 'ALL' })
    wrapper.findComponent({ name: 'ReviewCard' }).vm.$emit('flip')
    await flushPromises()
    expect(dependencies.navigate).toHaveBeenCalledWith({
      type: 'redirectTo',
      url: '/sub-packages/favorites/review-front?index=0&bank=VOCABULARY&scope=ALL'
    })
    wrapper.unmount()
  })
  it('提交复习期间切后台再返回，不保留旧请求的loading且迟到结果不跳转', async () => {
    let finish!: () => void
    const wrapper = render()
    await dependencies.load?.({ cardIds: 'card' })
    await flushPromises()
    dependencies.complete.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        })
    )
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '完成复习')!
      .trigger('click')
    await flushPromises()
    dependencies.hide?.()
    dependencies.list = vi
      .fn()
      .mockResolvedValue({ items: useFavoriteStore().items, has_more: false, next_cursor: null })
    await dependencies.show?.()
    await flushPromises()
    expect(
      wrapper
        .findAllComponents({ name: 'AppButton' })
        .find((button) => button.props('label') === '完成复习')
        ?.props('loading')
    ).toBe(false)
    finish()
    await flushPromises()
    expect(dependencies.navigate).not.toHaveBeenCalled()
    wrapper.unmount()
  })
  it('创建会话返回的新快照版本与已缓存资料不同，先提示刷新而不显示旧卡完成', async () => {
    const store = useFavoriteStore()
    store.items = [
      {
        id: 'card',
        snapshot_version: 1,
        entry_type: 'VOCABULARY',
        english: 'coffee',
        sources: []
      } as unknown as FavoriteItem
    ]
    dependencies.create.mockResolvedValue({
      id: 'new-version',
      card_count: 1,
      card_ids: ['card'],
      snapshot_versions: [2]
    })
    const wrapper = render()
    await dependencies.load?.({ cardIds: 'card' })
    await flushPromises()
    expect(wrapper.findComponent({ name: 'ReviewCard' }).exists()).toBe(false)
    expect(wrapper.findAll('button').some((button) => button.text() === '刷新复习')).toBe(true)
    expect(dependencies.track).not.toHaveBeenCalled()
    wrapper.unmount()
  })
  it('服务端已取消的缓存卡在创建会话被拒绝后提供刷新，不继续显示可完成旧卡', async () => {
    useFavoriteStore().items = [
      {
        id: 'card',
        snapshot_version: 1,
        entry_type: 'VOCABULARY',
        english: 'coffee',
        sources: []
      } as unknown as FavoriteItem
    ]
    dependencies.create.mockRejectedValueOnce({ code: 'REVIEW_CARDS_INVALID' })
    const wrapper = render()
    await dependencies.load?.({ cardIds: 'card' })
    await flushPromises()
    expect(wrapper.findComponent({ name: 'ReviewCard' }).exists()).toBe(false)
    expect(wrapper.findAll('button').some((button) => button.text() === '刷新复习')).toBe(true)
    wrapper.unmount()
  })
  it('创建复习在途取消当前卡，迟到会话不能恢复已取消词卡', async () => {
    const store = useFavoriteStore()
    let finish!: (value: unknown) => void
    dependencies.create.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    const wrapper = render()
    const loading = dependencies.load?.({ cardIds: 'card' })
    await flushPromises()
    await store.remove('card', {
      remove: async () => ({ favorite_id: 'card', active: false })
    } as never)
    finish({ id: 'stale-session', card_count: 1 })
    await loading
    await flushPromises()
    expect(store.tabState.VOCABULARY.review?.cardIds).toEqual([])
    expect(store.tabState.VOCABULARY.review?.session).toBeUndefined()
    expect(wrapper.findComponent({ name: 'ReviewCard' }).exists()).toBe(false)
    expect(dependencies.track).not.toHaveBeenCalled()
    wrapper.unmount()
  })
  it('快照冲突提供刷新复习动作，新会话使用最新有效快照并更换固定键', async () => {
    const wrapper = render()
    await dependencies.load?.({ cardIds: 'card' })
    await flushPromises()
    const oldKey = dependencies.create.mock.calls[0]?.[1]
    dependencies.complete.mockRejectedValueOnce({ code: 'REVIEW_SNAPSHOT_CHANGED' })
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '完成复习')!
      .trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('收藏已取消或更新')
    const refresh = wrapper.findAll('button').find((button) => button.text() === '刷新复习')
    expect(refresh).toBeDefined()
    dependencies.list = vi.fn().mockResolvedValue({
      items: [
        {
          id: 'card',
          snapshot_version: 2,
          entry_type: 'VOCABULARY',
          english: 'coffee',
          chinese: '咖啡',
          sources: []
        }
      ],
      has_more: false,
      next_cursor: null
    })
    dependencies.create.mockResolvedValue({ id: 'new-session', card_count: 1 })
    await refresh!.trigger('click')
    await flushPromises()
    expect(dependencies.list).toHaveBeenCalledOnce()
    expect(dependencies.complete).toHaveBeenCalledOnce()
    expect(dependencies.create.mock.calls[1]?.[1]).not.toBe(oldKey)
    expect(useFavoriteStore().tabState.VOCABULARY.review?.session?.id).toBe('new-session')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '完成复习')!
      .trigger('click')
    await flushPromises()
    expect(dependencies.complete).toHaveBeenLastCalledWith('new-session', expect.any(String))
    wrapper.unmount()
  })
  it('相同ID快照版本变化不能复用已冻结旧版的复习会话', async () => {
    const store = useFavoriteStore()
    store.items = [
      {
        id: 'card',
        snapshot_version: 2,
        entry_type: 'VOCABULARY',
        english: 'coffee',
        sources: []
      } as unknown as FavoriteItem
    ]
    store.updateTabState('VOCABULARY', {
      review: {
        cardIds: ['card'],
        index: 0,
        face: 'FRONT',
        createKey: 'old-key',
        session: {
          id: 'old-session',
          card_count: 1,
          started_at: '',
          card_ids: ['card'],
          snapshot_versions: [1]
        } as never
      }
    })
    const wrapper = render()
    await dependencies.load?.({ bank: 'VOCABULARY', index: '0' })
    expect(dependencies.create).toHaveBeenCalledOnce()
    expect(dependencies.create.mock.calls[0]?.[1]).not.toBe('old-key')
    expect(store.tabState.VOCABULARY.review?.session?.id).toBe('session')
    wrapper.unmount()
  })
  it.each(['get', 'create'] as const)('清空后迟到%s不能恢复词卡或复习会话', async (operation) => {
    let finish!: (value: unknown) => void
    dependencies[operation].mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    const wrapper = render()
    const loading = dependencies.load?.({ cardIds: 'card' })
    await flushPromises()
    dependencies.session.cleanupGeneration++
    useFavoriteStore().clear()
    finish(
      operation === 'get'
        ? {
            id: 'card',
            entry_type: 'VOCABULARY',
            english: 'coffee',
            sources: []
          }
        : { id: 'late-session', card_count: 1 }
    )
    await loading
    await flushPromises()
    expect(useFavoriteStore().items).toEqual([])
    expect(useFavoriteStore().tabState.VOCABULARY.review).toBeUndefined()
    expect(wrapper.findComponent({ name: 'ReviewCard' }).exists()).toBe(false)
    expect(dependencies.track).not.toHaveBeenCalled()
    wrapper.unmount()
  })
  it('完整快照已预取后切换正背面不再次请求任何卡片资料', async () => {
    const store = useFavoriteStore()
    store.items = [
      {
        id: 'card',
        english: 'medium',
        chinese: '中杯',
        entry_type: 'VOCABULARY',
        sources: []
      } as unknown as FavoriteItem
    ]
    store.updateTabState('VOCABULARY', {
      review: {
        cardIds: ['card'],
        index: 0,
        face: 'FRONT',
        session: { id: 'session', card_count: 1, started_at: '' }
      }
    })
    const wrapper = render()
    await dependencies.load?.({ index: '0', bank: 'VOCABULARY' })
    expect(dependencies.get).not.toHaveBeenCalled()
    expect(dependencies.create).not.toHaveBeenCalled()
    expect(wrapper.findComponent({ name: 'ReviewCard' }).exists()).toBe(true)
    wrapper.unmount()
  })
  it('首张有效词卡就绪时创建队列并记开始，完成复用该会话及幂等键', async () => {
    const wrapper = render()
    await dependencies.load?.({ cardIds: 'card' })
    await flushPromises()
    expect(dependencies.create).toHaveBeenCalledOnce()
    expect(dependencies.track).toHaveBeenCalledWith(
      'review_start_success',
      { entry_type: 'VOCABULARY' },
      expect.objectContaining({ token: 1, once: expect.any(String) })
    )
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '完成复习')!
      .trigger('click')
    await flushPromises()
    expect(dependencies.create).toHaveBeenCalledOnce()
    expect(dependencies.complete).toHaveBeenCalledWith('session', expect.any(String))
    expect(dependencies.track).toHaveBeenCalledWith(
      'review_complete_success',
      { entry_type: 'VOCABULARY' },
      expect.objectContaining({ token: 1, once: expect.any(String) })
    )
    wrapper.unmount()
  })
  it('卡片无效或请求失败时不创建复习队列及成功事件', async () => {
    dependencies.get.mockRejectedValueOnce(new Error('missing'))
    const wrapper = render()
    await dependencies.load?.({ cardIds: 'missing' })
    expect(dependencies.create).not.toHaveBeenCalled()
    expect(dependencies.track).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
