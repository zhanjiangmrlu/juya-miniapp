import { expect, it } from 'vitest'

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
