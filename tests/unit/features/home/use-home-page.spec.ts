import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useHomePage } from '@/features/home/use-home-page'
import { useHomeStore } from '@/stores/home'
import { useLearningStore } from '@/stores/learning'
import { useSessionStore } from '@/stores/session'

import type { SceneSummary } from '@/shared/contracts/learning'
import type { UserProfile } from '@/shared/contracts/profile'
const fixture = vi.hoisted(() => ({
  ready: false,
  requests: 0,
  forced: [] as boolean[],
  destinations: [] as string[],
  items: [] as SceneSummary[],
  profileRequest: vi.fn(),
  pendingSession: undefined as Promise<boolean> | undefined
}))
vi.mock('@/services/startup', () => ({
  ensureSession: async (force = false) => {
    fixture.forced.push(force)
    return fixture.pendingSession ?? fixture.ready
  }
}))
vi.mock('@/services/runtime', () => ({
  getRuntimeServices: () => ({
    profile: { get: fixture.profileRequest },
    home: {
      getHome: async () => {
        fixture.requests++
        return {
          checkins: { current_streak: 0, longest_streak: 0, total_days: 0 },
          greeting: '',
          unread_message_count: 0,
          today_task: { kind: 'CONTINUE_SCENE', target_id: 'actual-id', card_ids: [] }
        }
      }
    },
    catalog: {
      getModules: async () => ({ items: [] }),
      getCatalog: async () => ({ authorization_pending: false, items: fixture.items })
    }
  })
}))
describe('首页静默身份及任务入口', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fixture.ready = false
    fixture.requests = 0
    fixture.forced = []
    fixture.items = []
    fixture.destinations = []
    fixture.pendingSession = undefined
    fixture.profileRequest.mockReset().mockResolvedValue({
      avatar_url: null,
      juya_id: 'current-user',
      nickname: '本地小芽'
    })
    useSessionStore().accessToken = 'current-session'
    vi.stubGlobal('uni', {
      removeStorageSync: vi.fn(),
      /** 记录实际导航目的地，options 为平台路由与成功回调 */
      navigateTo: (options: { url: string; success: () => void }) => {
        fixture.destinations.push(options.url)
        options.success()
      }
    })
  })
  it('重连成功重新读取资料，恢复真实昵称', async () => {
    fixture.ready = true
    const page = useHomePage()
    await page.retry()
    expect(fixture.profileRequest).toHaveBeenCalledOnce()
    expect(useSessionStore().profile?.nickname).toBe('本地小芽')
    expect(page.home.view.salutation).toContain('本地小芽')
  })
  it('已有资料的普通刷新不重复读取，但主动重连会刷新资料', async () => {
    fixture.ready = true
    useSessionStore().profile = { avatar_url: null, juya_id: 'current-user', nickname: '旧昵称' }
    const page = useHomePage()
    await page.load()
    expect(fixture.profileRequest).not.toHaveBeenCalled()
    await page.retry()
    expect(fixture.profileRequest).toHaveBeenCalledOnce()
    expect(useSessionStore().profile?.nickname).toBe('本地小芽')
  })
  it('页面离开后迟到资料不得写回共享会话', async () => {
    fixture.ready = true
    let resolve!: (profile: UserProfile) => void
    fixture.profileRequest.mockReturnValueOnce(
      new Promise<UserProfile>((done) => {
        resolve = done
      })
    )
    const page = useHomePage()
    const pending = page.retry()
    await vi.waitFor(() => expect(fixture.profileRequest).toHaveBeenCalledOnce())
    page.cancel()
    resolve({ avatar_url: null, juya_id: 'current-user', nickname: '迟到昵称' })
    await pending
    expect(useSessionStore().profile).toBeUndefined()
  })
  it('会话令牌切换后旧资料不得覆盖新会话', async () => {
    fixture.ready = true
    let resolve!: (profile: UserProfile) => void
    fixture.profileRequest.mockReturnValueOnce(
      new Promise<UserProfile>((done) => {
        resolve = done
      })
    )
    const page = useHomePage()
    const pending = page.retry()
    await vi.waitFor(() => expect(fixture.profileRequest).toHaveBeenCalledOnce())
    const session = useSessionStore()
    session.accessToken = 'new-session'
    session.profile = { avatar_url: null, juya_id: 'new-user', nickname: '新用户' }
    resolve({ avatar_url: null, juya_id: 'current-user', nickname: '旧用户' })
    await pending
    expect(session.profile?.nickname).toBe('新用户')
  })
  it('旧刷新资料晚到不得覆盖同页新请求取得的昵称', async () => {
    fixture.ready = true
    let resolve!: (profile: UserProfile) => void
    fixture.profileRequest.mockReturnValueOnce(
      new Promise<UserProfile>((done) => {
        resolve = done
      })
    )
    const page = useHomePage()
    const old = page.retry()
    await vi.waitFor(() => expect(fixture.profileRequest).toHaveBeenCalledOnce())
    await page.retry()
    resolve({ avatar_url: null, juya_id: 'current-user', nickname: '旧刷新' })
    await old
    expect(useSessionStore().profile?.nickname).toBe('本地小芽')
  })
  it('可选资料请求失败仍呈现真实首页数据，不生成网络错误', async () => {
    fixture.ready = true
    fixture.profileRequest.mockRejectedValueOnce(new Error('资料暂不可用'))
    const page = useHomePage()
    await page.retry()
    expect(fixture.profileRequest).toHaveBeenCalledOnce()
    expect(page.home.error).toBe(false)
    expect(page.home.view.todayTask?.url).toBe('/sub-packages/scene/dialogue?sceneId=actual-id')
  })
  it('首页隐藏后迟到身份成功不得再发首页请求', async () => {
    let resolve!: (ready: boolean) => void
    fixture.pendingSession = new Promise((done) => {
      resolve = done
    })
    const page = useHomePage()
    const pending = page.load()
    page.cancel()
    resolve(true)
    await pending
    expect(fixture.requests).toBe(0)
    expect(page.home.loading).toBe(false)
  })
  it('首页隐藏后迟到身份失败不得清空新页面目录', async () => {
    let resolve!: (ready: boolean) => void
    fixture.pendingSession = new Promise((done) => {
      resolve = done
    })
    const page = useHomePage()
    const pending = page.load()
    page.cancel()
    const learning = useLearningStore()
    await learning.load({
      getModules: async () => ({ items: [] }),
      getCatalog: async () => ({ authorization_pending: true, items: [] })
    })
    resolve(false)
    await pending
    expect(learning.catalog.authorization_pending).toBe(true)
    expect(page.home.error).toBe(false)
  })
  it('目录已经变为PREVIEW时，旧首页任务不得进入正文', async () => {
    fixture.ready = true
    fixture.items = [
      {
        access: 'PREVIEW',
        scene_id: 'actual-id',
        chinese_title: '已到期',
        title: 'Expired',
        series: 'Test',
        tags: []
      }
    ]
    const page = useHomePage()
    await page.load()
    await page.startTask()
    expect(fixture.destinations).toEqual([])
  })
  it('授权待确认时，即使摘要仍标记OPEN也不执行场景任务', async () => {
    fixture.ready = true
    fixture.items = [
      {
        access: 'OPEN',
        scene_id: 'actual-id',
        chinese_title: '场景',
        title: 'Scene',
        series: 'Test',
        tags: []
      }
    ]
    const page = useHomePage()
    await page.load()
    useLearningStore().catalog.authorization_pending = true
    await page.startTask()
    expect(fixture.destinations).toEqual([])
  })
  it('目标确认可访问时导航使用服务端真实目标', async () => {
    fixture.ready = true
    fixture.items = [
      {
        access: 'OPEN',
        scene_id: 'actual-id',
        chinese_title: '场景',
        title: 'Scene',
        series: 'Test',
        tags: []
      }
    ]
    const page = useHomePage()
    await page.load()
    await page.startTask()
    expect(fixture.destinations).toEqual(['/sub-packages/scene/dialogue?sceneId=actual-id'])
  })
  it('收藏翻卡不依赖目录授权，仍执行完整卡片队列', async () => {
    fixture.ready = true
    const page = useHomePage()
    await page.load()
    useLearningStore().catalog.authorization_pending = true
    useHomeStore().data!.today_task = {
      kind: 'FAVORITE_REVIEW',
      target_id: null,
      card_ids: ['first', 'last']
    }
    await page.startTask()
    expect(fixture.destinations).toEqual([
      '/sub-packages/favorites/review-front?cardIds=first%2Clast'
    ])
  })
  it('静默登录失败保持兜底且不请求身份首页数据', async () => {
    const page = useHomePage()
    await page.load()
    expect(page.home.data).toBeNull()
    expect(page.home.error).toBe(true)
    expect(fixture.requests).toBe(0)
  })
  it('重连重新静默登录后取真实任务，并保持服务端标识', async () => {
    const page = useHomePage()
    await page.load()
    fixture.ready = true
    await page.retry()
    expect(page.home.error).toBe(false)
    expect(page.home.view.todayTask?.url).toBe('/sub-packages/scene/dialogue?sceneId=actual-id')
    expect(fixture.forced).toEqual([false, true])
  })
  it('权益用户的开放场景历史任务仍能展示真实目标摘要', async () => {
    fixture.ready = true
    fixture.items = [
      {
        access: 'OPEN',
        scene_id: 'actual-id',
        chinese_title: '真实目标',
        title: 'Real target',
        series: '日常英语',
        tags: [],
        progress: 100
      },
      {
        access: 'FORMAL',
        scene_id: 'entitled',
        chinese_title: '已有权益',
        title: 'Entitled',
        series: '旅行英语',
        tags: []
      }
    ]
    const page = useHomePage()
    await page.load()
    expect(page.taskScene.value?.chineseTitle).toBe('真实目标')
  })
})
