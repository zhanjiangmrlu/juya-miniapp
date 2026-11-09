import { expect, it } from 'vitest'

import { analyticsPageProperties } from '@/services/analytics-page'

it('reads only content identities on the known scene and listening routes', () => {
  expect(
    analyticsPageProperties({
      route: 'sub-packages/scenes/detail',
      options: { id: 'scene-1', token: 'private', source: 'personal-input' }
    })
  ).toEqual({ content_type: 'scene', content_id: 'scene-1' })
  expect(
    analyticsPageProperties({
      route: 'sub-packages/listening/article',
      options: { id: 'article-7' }
    })
  ).toEqual({ content_type: 'listening', content_id: 'article-7' })
  expect(
    analyticsPageProperties({
      route: 'sub-packages/feedback/detail',
      options: { id: 'private-feedback' }
    })
  ).toEqual({})
  expect(
    analyticsPageProperties({ route: 'pages/login/index', options: { redirect: 'private' } })
  ).toEqual({})
  expect(analyticsPageProperties()).toEqual({})
})
