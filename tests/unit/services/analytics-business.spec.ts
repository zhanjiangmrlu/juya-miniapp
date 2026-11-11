import { afterEach, expect, it, vi } from 'vitest'

import { analytics } from '@/services/analytics'
import { businessAnalytics } from '@/services/analytics-business'
import { ApiError } from '@/services/errors'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it.each([
  [new ApiError('invalid', 'private phone', 422), 'validation'],
  [new ApiError('network_unknown', 'private token'), 'result_unknown'],
  [new ApiError('forbidden', 'private account', 403), 'forbidden'],
  [new ApiError('unauthenticated', 'private', 401), 'unauthenticated'],
  [new ApiError('gone', 'private', 410), 'content_unavailable'],
  [new ApiError('profile_changed', 'private', 409), 'conflict'],
  [new ApiError('network', 'private'), 'network'],
  [{ errMsg: 'openDocument:fail private-file' }, 'platform'],
  [new Error('private text'), 'other']
])('classifies business errors without passing private details', (reason, errorKind) => {
  const track = vi.spyOn(analytics, 'track')
  businessAnalytics.error('profile_save', reason)
  expect(track).toHaveBeenCalledWith(
    'business_error',
    expect.objectContaining({ action: 'profile_save', error_kind: errorKind })
  )
  expect(JSON.stringify(track.mock.calls)).not.toContain('private')
})

it('ignores cancellation and session invalidation and isolates observer failures', () => {
  const track = vi.spyOn(analytics, 'track')
  businessAnalytics.error('image_open', { errMsg: 'previewImage:fail cancel' })
  businessAnalytics.error('profile_save', new ApiError('session_changed', 'changed'))
  expect(track).not.toHaveBeenCalled()
  track.mockImplementation(() => {
    throw new Error('observer')
  })
  expect(() => businessAnalytics.error('profile_save', new Error('failed'))).not.toThrow()
})

it('uses route-only entry targets and finite public identifiers', () => {
  vi.stubGlobal('getCurrentPages', () => [{ route: 'pages/home/index?token=private' }])
  const track = vi.spyOn(analytics, 'track')
  businessAnalytics.entry('home_learning', '/pages/learning/index?token=private')
  expect(track).toHaveBeenCalledWith('entry_click', {
    page_path: 'pages/home/index',
    entry_source: 'home_learning',
    target_page: 'pages/learning/index'
  })
})
