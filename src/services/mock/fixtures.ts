import type { HomeResponse } from '@/shared/contracts/home'
import type { LearningCatalogResponse } from '@/shared/contracts/learning'
import type { UserProfile } from '@/shared/contracts/profile'
export const MOCK_FIXTURES = {
  catalog: {
    authorization_pending: false,
    items: [
      {
        access: 'OPEN',
        chinese_title: '在咖啡店',
        progress: 32,
        scene_id: 'scene-coffee-shop',
        series: '日常英语',
        tags: ['开放学习场景'],
        title: 'At the Coffee Shop'
      }
    ]
  } satisfies LearningCatalogResponse,
  home: {
    checkins: { current_streak: 12, longest_streak: 18, total_days: 36 },
    greeting: '下午好',
    today_task: { card_ids: [], kind: 'CONTINUE_SCENE', target_id: 'scene-castle' },
    unread_message_count: 1
  } satisfies HomeResponse,
  user: {
    avatar_url: null,
    juya_id: 'JY-240918-0731',
    nickname: '小芽',
    wechat_nickname: null
  } satisfies UserProfile
} as const
