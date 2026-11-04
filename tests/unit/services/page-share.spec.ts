import { expect, it } from 'vitest'

import { pageShare } from '@/services/page-share'
import { homeShare } from '@/services/share-service'

it('shares the app with the supplied title and channel-specific covers without sender state', () => {
  expect(pageShare.friends).toEqual({
    title: '句芽英语｜把英语用进生活里',
    path: '/pages/home/index',
    imageUrl: '/static/brand/page-share-friends-fallback.jpg'
  })
  expect(pageShare.timeline).toEqual({
    title: '句芽英语｜把英语用进生活里',
    query: 'target=home',
    imageUrl: '/static/brand/page-share-timeline-fallback.jpg'
  })
})

it('preserves the existing learning share title, covers, and destination', () => {
  expect(homeShare).toEqual({
    friends: {
      title: '句芽英语｜在真实场景里学英语',
      path: '/pages/learning/index?target=learning',
      imageUrl: '/static/brand/brand-share.png'
    },
    timeline: {
      title: '句芽英语｜在真实场景里学英语',
      query: 'target=learning',
      imageUrl: '/static/brand/brand-share-square.png'
    }
  })
})
