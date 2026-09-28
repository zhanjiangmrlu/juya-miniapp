import type { HomeResponse } from '@/shared/contracts/home'
import type {
  LearningCatalogResponse,
  LearningModulesResponse,
  SceneOpenResponse,
  SignedMediaResponse
} from '@/shared/contracts/learning'
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
  scene: {
    access: 'OPEN',
    activated_at: null,
    authorization_pending: false,
    earliest_expires_at: null,
    scene: {
      access: 'OPEN',
      chinese_title: '城堡展览讨论会',
      entries: [
        {
          audio: { target_id: 'audio-sentence-1', target_type: 'sentence', version_id: 'v1' },
          chinese: '你觉得他们为什么举办这个展览？',
          entry_id: 'sentence-1',
          entry_type: 'DIALOGUE',
          source_locator: 'sentence-1',
          speaker: 'Ivy',
          text: 'Why do you think they put together this exhibit?'
        },
        {
          audio: { target_id: 'audio-sentence-2', target_type: 'sentence', version_id: 'v1' },
          chinese: '这有助于人们理解城堡是如何逐渐发展的。',
          entry_id: 'sentence-2',
          entry_type: 'DIALOGUE',
          source_locator: 'sentence-2',
          speaker: 'Noah',
          text: 'It helps people understand how the castle evolved.'
        },
        {
          audio: { target_id: 'audio-evolved', target_type: 'word', version_id: 'v1' },
          chinese: '演变；逐渐发展',
          entry_id: 'word-evolved',
          entry_type: 'VOCABULARY',
          explanation: '用于描述事物逐步变化。',
          phonetic: "/ɪ'vɒlvd/",
          source_locator: 'sentence-2',
          text: 'evolved'
        },
        {
          audio: { target_id: 'audio-put-together', target_type: 'phrase', version_id: 'v1' },
          chinese: '组织；组合',
          entry_id: 'phrase-put-together',
          entry_type: 'PHRASE',
          explanation: '在此处表示组织或举办。',
          source_locator: 'sentence-1',
          text: 'put together'
        }
      ],
      hero_image_url: '/static/images/castle-card.png',
      image_url: '/static/images/castle-card.png',
      scene_id: 'scene-castle',
      series: '日常英语',
      tags: ['开放学习场景'],
      title: 'Discussing the Castle Exhibit'
    },
    sources: ['OPEN']
  } satisfies SceneOpenResponse,
  signedMedia: {
    expires_at: '2099-01-01T00:00:00Z',
    target_id: 'mock-audio',
    url: 'https://example.test/mock-audio.mp3'
  } satisfies SignedMediaResponse,
  user: {
    avatar_url: null,
    juya_id: 'JY-240918-0731',
    nickname: '小芽',
    wechat_nickname: null
  } satisfies UserProfile
} as const
