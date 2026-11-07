import { expect, it } from 'vitest'

import { createLoginReturn } from '@/services/login-return'

it('captures before identity cleanup and consumes a successful return only once', () => {
  const flow = createLoginReturn()
  let translation = true
  flow.register('/sub-packages/scenes/detail', () => ({
    page: '/sub-packages/scenes/detail',
    type: 'scene',
    id: 'card',
    tab: 'notes',
    category: '',
    scroll: 321,
    translation,
    audioPosition: 12,
    playbackRate: 1.5,
    version: 'v1'
  }))
  flow.begin('/sub-packages/scenes/detail?id=card')
  translation = false
  flow.succeed()
  expect(flow.take('/sub-packages/scenes/detail', 'card')).toMatchObject({
    translation: true,
    scroll: 321,
    tab: 'notes'
  })
  expect(flow.take('/sub-packages/scenes/detail', 'card')).toBeNull()
})
it('cancellation leaves no restorable mutation or automatic action', () => {
  const flow = createLoginReturn()
  flow.begin('/pages/home/index')
  flow.cancel()
  flow.succeed()
  expect(flow.target()).toBe('/pages/home/index')
  expect(flow.take('/pages/home/index')).toBeNull()
})
it('does not consume a return intended for another detail', () => {
  const flow = createLoginReturn()
  flow.register('/sub-packages/listening/article', () => ({
    page: '/sub-packages/listening/article',
    type: 'listening',
    id: 'article',
    tab: '',
    category: 'cat',
    scroll: 10,
    translation: false,
    audioPosition: 5,
    playbackRate: 1,
    version: 'v1'
  }))
  flow.begin('/sub-packages/listening/article?id=article')
  flow.succeed()
  expect(flow.take('/sub-packages/listening/article', 'other')).toBeNull()
  expect(flow.take('/sub-packages/listening/article', 'article')?.category).toBe('cat')
})
it('returns a cancelled login to the captured guest location without a pending action', () => {
  const flow = createLoginReturn()
  flow.register('/sub-packages/scenes/detail', () => ({
    page: '/sub-packages/scenes/detail',
    type: 'scene',
    id: 'card',
    tab: 'notes',
    category: '',
    scroll: 480,
    translation: true,
    audioPosition: 10,
    playbackRate: 1.5,
    version: 'v1'
  }))
  flow.begin('/sub-packages/scenes/detail?id=card')
  flow.resumeGuest()
  expect(flow.take('/sub-packages/scenes/detail', 'card')).toMatchObject({
    scroll: 480,
    translation: true
  })
  expect(flow.take('/sub-packages/scenes/detail', 'card')).toBeNull()
})
