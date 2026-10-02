import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SceneSummary } from '@/shared/contracts/learning'

import { useHomePage } from './use-home-page'
const fixture = vi.hoisted(() => ({
  ready: false,
  requests: 0,
  forced: [] as boolean[],
  items: [] as SceneSummary[]
}))
vi.mock('@/services/startup', () => ({
  ensureSession: async (force = false) => {
    fixture.forced.push(force)
    return fixture.ready
  }
}))
vi.mock('@/services/runtime', () => ({
  getRuntimeServices: () => ({
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
    vi.stubGlobal('uni', { removeStorageSync: vi.fn() })
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
    expect(page.home.view.todayTask?.url).toBe('/pages/scene/dialogue?sceneId=actual-id')
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
