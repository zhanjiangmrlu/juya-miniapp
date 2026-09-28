import type { HomeResponse } from '@/shared/contracts/home'
import type { LearningCatalogResponse, LearningModulesResponse } from '@/shared/contracts/learning'
import type { UserProfile } from '@/shared/contracts/profile'
export const MOCK_FIXTURES = {
  catalog: {
    authorization_pending: false,
    items: [
      {
        access: 'OPEN',
        chinese_title: '讨论城堡展览',
        image_url: '/static/images/castle-card.png',
        progress: 68,
        scene_id: 'scene-castle',
        series: '日常英语',
        tags: ['开放学习场景'],
        title: 'Discussing the Castle Exhibit'
      },
      {
        access: 'OPEN',
        chinese_title: '点早餐',
        image_url: '/static/images/castle-card.png',
        progress: 0,
        scene_id: 'scene-breakfast',
        series: '日常英语',
        tags: ['开放学习场景'],
        title: 'Ordering Breakfast'
      },
      {
        access: 'OPEN',
        chinese_title: '在咖啡店',
        image_url: '/static/images/castle-card.png',
        progress: 32,
        scene_id: 'scene-coffee-shop',
        series: '日常英语',
        tags: ['开放学习场景'],
        title: 'At the Coffee Shop'
      },
      {
        access: 'PREVIEW',
        chinese_title: '周末公路旅行',
        description: '可查看主题、难度与简介',
        image_url: '/static/images/castle-card.png',
        scene_id: 'scene-weekend-trip',
        series: '旅行英语',
        tags: ['内容预览'],
        title: 'A Weekend Road Trip'
      }
    ],
    profile_completion_enabled: true
  } satisfies LearningCatalogResponse,
  home: {
    checkins: { current_streak: 12, longest_streak: 18, total_days: 36 },
    greeting: '下午好',
    today_task: { card_ids: [], kind: 'CONTINUE_SCENE', target_id: 'scene-castle' },
    unread_message_count: 1
  } satisfies HomeResponse,
  modules: {
    items: [
      {
        enabled: true,
        key: 'scene_learning',
        public_id: 'module-scene-learning',
        title: '场景学习'
      }
    ]
  } satisfies LearningModulesResponse,
  user: {
    avatar_url: null,
    juya_id: 'JY-240918-0731',
    nickname: '小芽',
    wechat_nickname: null
  } satisfies UserProfile
} as const
