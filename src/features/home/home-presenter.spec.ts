import { describe, expect, it } from 'vitest'

import type { SceneCardViewModel } from '@/features/learning/catalog-presenter'
import type { HomeResponse, TodayTask } from '@/shared/contracts/home'
import type { UserProfile } from '@/shared/contracts/profile'

import { presentHome, resolveTaskScene, resolveTodayTask } from './home-presenter'

const profile: UserProfile = {
  avatar_url: null,
  juya_id: 'JY-001',
  nickname: '小芽',
  wechat_nickname: '微信芽'
}

const home: HomeResponse = {
  checkins: { current_streak: 3, longest_streak: 7, total_days: 12 },
  greeting: '服务端问候不作为展示时间源',
  today_task: { card_ids: [], kind: 'CONTINUE_SCENE', target_id: 'scene-001' },
  unread_message_count: 2
}

describe('presentHome', () => {
  it('称呼依次使用自定义昵称、微信昵称和学习者', () => {
    const now = new Date('2026-09-28T00:00:00.000Z')

    expect(presentHome(home, profile, now).salutation).toBe('早上好，小芽')
    expect(presentHome(home, { ...profile, nickname: null }, now).salutation).toBe('早上好，微信芽')
    expect(
      presentHome(home, { ...profile, nickname: null, wechat_nickname: null }, now).salutation
    ).toBe('早上好，学习者')
  })

  it('未建立身份时只展示品牌兜底，不伪造游客学习数据', () => {
    const view = presentHome(null, undefined, new Date('2026-09-28T00:00:00.000Z'))

    expect(view.checkins).toBeNull()
    expect(view.todayTask).toBeNull()
    expect(view.unreadMessageCount).toBeNull()
    expect(view.isFallback).toBe(true)
  })
})

describe('resolveTodayTask', () => {
  it.each<[TodayTask, string]>([
    [
      { card_ids: [], kind: 'CONTINUE_SCENE', target_id: 'scene-001' },
      '/pages/scene/dialogue?sceneId=scene-001'
    ],
    [
      { card_ids: [], kind: 'NEW_SCENE', target_id: 'scene-002' },
      '/pages/scene/detail?sceneId=scene-002'
    ],
    [
      { card_ids: ['card-1', 'card-2'], kind: 'FAVORITE_REVIEW', target_id: null },
      '/pages/favorites/review-front?cardIds=card-1%2Ccard-2'
    ],
    [
      { card_ids: [], kind: 'HISTORY_SCENE', target_id: 'scene-003' },
      '/pages/scene/dialogue?sceneId=scene-003&from=history'
    ]
  ])('为 $kind 生成稳定目标路由', (task, url) => {
    expect(resolveTodayTask(task)?.url).toBe(url)
  })
})

describe('首页任务场景展示', () => {
  const coffee: SceneCardViewModel = {
    accessLabel: '开放学习场景',
    canOpen: true,
    chineseTitle: '在咖啡店',
    description: '',
    entryUrl: '/pages/scene/detail?sceneId=coffee',
    progress: 68,
    sceneId: 'coffee',
    series: '日常英语',
    title: 'At the Coffee Shop'
  }

  it('任务卡展示任务实际目标的标题与进度，不使用目录第一项', () => {
    const scenes = [{ ...coffee, sceneId: 'another', progress: 0 }, coffee]
    expect(
      resolveTaskScene({ card_ids: [], kind: 'CONTINUE_SCENE', target_id: 'coffee' }, scenes)
    ).toEqual(coffee)
  })

  it('目标不存在、无权限或收藏任务时不展示无关场景', () => {
    expect(
      resolveTaskScene({ card_ids: [], kind: 'NEW_SCENE', target_id: 'missing' }, [coffee])
    ).toBeUndefined()
    expect(
      resolveTaskScene({ card_ids: [], kind: 'CONTINUE_SCENE', target_id: 'coffee' }, [
        { ...coffee, canOpen: false }
      ])
    ).toBeUndefined()
    expect(
      resolveTaskScene({ card_ids: ['card'], kind: 'FAVORITE_REVIEW', target_id: null }, [coffee])
    ).toBeUndefined()
    expect(resolveTaskScene(null, [coffee])).toBeUndefined()
  })
})
