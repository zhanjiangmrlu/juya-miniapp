import { afterEach, expect, it, vi } from 'vitest'

import { setShareMenu } from '@/services/native-share'
import { runtimeMode } from '@/services/runtime-mode'

afterEach(() => {
  runtimeMode.update({ apiCategory: 'default' })
  vi.unstubAllGlobals()
})

it('hides both menus on private/unready pages and in browseOnly despite cached readiness', () => {
  const showShareMenu = vi.fn(),
    hideShareMenu = vi.fn()
  vi.stubGlobal('uni', { showShareMenu, hideShareMenu })
  setShareMenu(false)
  expect(hideShareMenu).toHaveBeenCalledWith({ menus: ['shareAppMessage', 'shareTimeline'] })
  setShareMenu(true)
  expect(showShareMenu).toHaveBeenCalledWith({
    withShareTicket: false,
    menus: ['shareAppMessage', 'shareTimeline']
  })
  runtimeMode.update({ apiCategory: 'browseOnly' })
  setShareMenu(true)
  expect(showShareMenu).toHaveBeenCalledTimes(1)
  expect(hideShareMenu).toHaveBeenCalledTimes(2)
})
