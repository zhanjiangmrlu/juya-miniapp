import { expect, it, vi } from 'vitest'

vi.hoisted(() => {
  vi.stubGlobal('uni', { getStorageSync: () => undefined })
})

import { safeTarget } from '@/services/navigation'
it('only restores known pages and approved non-sensitive parameters', () => {
  expect(safeTarget('//outside.example/anything')).toBe('/pages/learning/index')
  expect(safeTarget('/sub-packages/account/contact-edit?phone=13800138000')).toBe(
    '/sub-packages/account/profile'
  )
  expect(safeTarget('/sub-packages/account/profile?phone=13800138000')).toBe(
    '/sub-packages/account/profile'
  )
  expect(safeTarget('/sub-packages/scenes/detail?id=card-1&phone=13800138000')).toBe(
    '/sub-packages/scenes/detail?id=card-1'
  )
})

it('coalesces concurrent unauthenticated page redirects and preserves the login screen', async () => {
  const { vi } = await import('vitest')
  const { openLogin } = await import('@/services/navigation')
  const callbacks: { complete: () => void }[] = [],
    reLaunch = vi.fn((options: { complete: () => void }) => {
      callbacks.push(options)
    })
  let pages: { route: string }[] = []
  vi.stubGlobal('uni', { reLaunch })
  vi.stubGlobal('getCurrentPages', () => pages)
  try {
    openLogin('/pages/learning/index')
    openLogin('/pages/learning/index')
    expect(reLaunch).toHaveBeenCalledTimes(1)
    callbacks[0]!.complete()
    pages = [{ route: 'pages/login/index' }]
    openLogin('/pages/learning/index')
    expect(reLaunch).toHaveBeenCalledTimes(1)
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
