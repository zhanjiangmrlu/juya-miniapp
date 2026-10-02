import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { useHomeStore } from '@/stores/home'
import { useLearningStore } from '@/stores/learning'

import type { HomeResponse } from '@/shared/contracts/home'
import type { LearningCatalogResponse } from '@/shared/contracts/learning'

/** 创建可人工放行的响应，T 为接口响应结构 */
const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<T>((done, fail) => {
    resolve = done
    reject = fail
  })
  return { promise, resolve, reject }
}
const homeResponse: HomeResponse = {
  checkins: { current_streak: 1, longest_streak: 1, total_days: 1 },
  greeting: '',
  unread_message_count: 0,
  today_task: { kind: 'CONTINUE_SCENE', target_id: 'current', card_ids: [] }
}
describe('共享摘要请求生命周期', () => {
  beforeEach(() => setActivePinia(createPinia()))
  it('旧请求 finally 不得提前结束新首页加载', async () => {
    const store = useHomeStore()
    const old = deferred<HomeResponse>()
    const latest = deferred<HomeResponse>()
    const first = store.load({ getHome: () => old.promise })
    const second = store.load({ getHome: () => latest.promise })
    old.resolve(homeResponse)
    await first
    expect(store.loading).toBe(true)
    expect(store.data).toBeNull()
    latest.resolve(homeResponse)
    await second
    expect(store.loading).toBe(false)
  })
  it('离开的首页不能取消新学习页的有效目录请求', async () => {
    const store = useLearningStore()
    const homeOwner = Symbol('home')
    const learningOwner = Symbol('learning')
    const old = deferred<LearningCatalogResponse>()
    const latest = deferred<LearningCatalogResponse>()
    const first = store.load(
      { getModules: async () => ({ items: [] }), getCatalog: () => old.promise },
      homeOwner
    )
    const second = store.load(
      { getModules: async () => ({ items: [] }), getCatalog: () => latest.promise },
      learningOwner
    )
    store.cancel(homeOwner)
    old.reject(new Error('old response'))
    await first
    expect(store.loading).toBe(true)
    expect(store.error).toBe(false)
    latest.resolve({ authorization_pending: true, items: [] })
    await second
    expect(store.catalog.authorization_pending).toBe(true)
    expect(store.error).toBe(false)
  })
  it('取消本页目录后成功响应不再写入旧权限', async () => {
    const store = useLearningStore()
    const owner = Symbol('hidden page')
    const response = deferred<LearningCatalogResponse>()
    const pending = store.load(
      { getModules: async () => ({ items: [] }), getCatalog: () => response.promise },
      owner
    )
    store.cancel(owner)
    response.resolve({
      authorization_pending: false,
      items: [
        {
          access: 'FORMAL',
          scene_id: 'expired',
          title: 'Expired',
          chinese_title: '旧权限',
          tags: [],
          series: 'Test'
        }
      ]
    })
    await pending
    expect(store.catalog.items).toEqual([])
    expect(store.loading).toBe(false)
  })
  it('清理首页后迟到响应不得恢复旧任务', async () => {
    const store = useHomeStore()
    const response = deferred<HomeResponse>()
    const pending = store.load({ getHome: () => response.promise })
    store.clear()
    response.resolve(homeResponse)
    await pending
    expect(store.data).toBeNull()
  })
  it('旧首页失败不得覆盖已成功的新请求', async () => {
    const store = useHomeStore()
    const old = deferred<HomeResponse>()
    const pending = store.load({ getHome: () => old.promise })
    await store.load({ getHome: async () => homeResponse })
    old.reject(new Error('旧请求失败'))
    await pending
    expect(store.data?.today_task?.target_id).toBe('current')
    expect(store.error).toBe(false)
  })
  it('清理目录后迟到响应不得恢复旧权限', async () => {
    const store = useLearningStore()
    const response = deferred<LearningCatalogResponse>()
    const pending = store.load({
      getModules: async () => ({ items: [] }),
      getCatalog: () => response.promise
    })
    store.clear()
    response.resolve({
      authorization_pending: false,
      items: [
        {
          access: 'FORMAL',
          scene_id: 'expired',
          title: 'Expired',
          chinese_title: '旧权限',
          tags: [],
          series: 'Test'
        }
      ]
    })
    await pending
    expect(store.catalog.items).toEqual([])
  })
})
