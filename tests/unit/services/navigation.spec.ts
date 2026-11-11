import { expect, it, vi } from 'vitest'

vi.hoisted(() => {
  vi.stubGlobal('uni', { getStorageSync: () => undefined })
})

import { safeTarget } from '@/services/navigation'
it('only restores known pages and approved non-sensitive parameters', () => {
  expect(safeTarget('//outside.example/anything')).toBe('/pages/home/index')
  expect(safeTarget('/sub-packages/account/contact-edit?phone=13800138000')).toBe(
    '/pages/profile/index'
  )
  expect(safeTarget('/pages/profile/index?phone=13800138000')).toBe('/pages/profile/index')
  expect(safeTarget('/sub-packages/scenes/detail?id=card-1&phone=13800138000')).toBe(
    '/sub-packages/scenes/detail?id=card-1'
  )
})

it('coalesces concurrent unauthenticated page redirects and preserves the login screen', async () => {
  const { vi } = await import('vitest')
  const { openLogin } = await import('@/services/navigation')
  const callbacks: { complete: () => void }[] = [],
    navigateTo = vi.fn((options: { complete: () => void }) => {
      callbacks.push(options)
    })
  let pages: { route: string }[] = []
  vi.stubGlobal('uni', { navigateTo, removeStorageSync: vi.fn() })
  vi.stubGlobal('getCurrentPages', () => pages)
  try {
    openLogin('/pages/learning/index')
    openLogin('/pages/learning/index')
    expect(navigateTo).toHaveBeenCalledTimes(1)
    callbacks[0]!.complete()
    pages = [{ route: 'pages/login/index' }]
    openLogin('/pages/learning/index')
    expect(navigateTo).toHaveBeenCalledTimes(1)
  } finally {
    vi.unstubAllGlobals()
  }
})

it('restores the validated scene feedback reference after login and strips unrelated personal parameters', () => {
  expect(
    safeTarget('/sub-packages/feedback/create?card_id=card-1&version_id=v-1&text=private')
  ).toBe('/sub-packages/feedback/create?card_id=card-1&version_id=v-1')
  expect(safeTarget('/sub-packages/feedback/create?card_id=card-1&version_id=%2Funsafe')).toBe(
    '/sub-packages/feedback/index'
  )
  expect(safeTarget('/sub-packages/feedback/detail?id=feedback-1&reply=private')).toBe(
    '/sub-packages/feedback/detail?id=feedback-1'
  )
})

it('retains only the stable shared-card target across login, without restoring a foreign queue', () => {
  expect(
    safeTarget(
      '/sub-packages/scenes/detail?target=scene&id=card-1&queue=foreign&version_id=old&sender=someone'
    )
  ).toBe('/sub-packages/scenes/detail?target=scene&id=card-1')
  expect(safeTarget('/pages/learning/index?target=learning&token=private')).toBe(
    '/pages/learning/index?target=learning'
  )
})

it('preserves a validated note login intent and notes fallback without accepting a foreign queue', () => {
  expect(
    safeTarget(
      '/sub-packages/scenes/detail?id=card-1&intent=study_note&source=learning_notes&queue=foreign'
    )
  ).toBe('/sub-packages/scenes/detail?id=card-1&source=learning_notes')
  expect(safeTarget('/pages/learning/index?tab=notes')).toBe('/pages/learning/index?tab=notes')
})

it('keeps a failed native login navigation at its source and makes its guest snapshot restorable', async () => {
  const { openLogin } = await import('@/services/navigation')
  const { loginReturn } = await import('@/services/login-return')
  const resume = vi.fn()
  const unregister = loginReturn.register(
    '/pages/home/index',
    () => ({
      page: '/pages/home/index',
      type: 'page',
      id: '',
      tab: '',
      category: '',
      scroll: 77,
      translation: false,
      audioPosition: 0,
      playbackRate: 1,
      version: ''
    }),
    resume
  )
  vi.stubGlobal('getCurrentPages', () => [{ route: 'pages/home/index' }])
  vi.stubGlobal('uni', {
    removeStorageSync: vi.fn(),
    navigateTo: (options: UniApp.NavigateToOptions) => {
      options.fail?.({ errMsg: 'stack full' })
      options.complete?.({ errMsg: 'stack full' })
    }
  })
  openLogin('/pages/home/index')
  expect(resume).toHaveBeenCalledOnce()
  expect(loginReturn.pending()).toBe(false)
  expect(loginReturn.take('/pages/home/index')?.scroll).toBe(77)
  unregister()
})

it('preserves only approved settings queries for in-place privacy login return', () => {
  expect(safeTarget('/sub-packages/account/settings?privacy=1&source=profile&secret=hidden')).toBe(
    '/sub-packages/account/settings?privacy=1&source=profile'
  )
  expect(safeTarget('/sub-packages/account/settings?privacy=0&source=outside')).toBe(
    '/sub-packages/account/settings'
  )
})
