import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

const hooks = vi.hoisted(() => ({
  load: undefined as undefined | ((query: Record<string, unknown>) => void),
  show: undefined as undefined | (() => void),
  hide: undefined as undefined | (() => void),
  unload: undefined as undefined | (() => void)
}))
vi.mock('@dcloudio/uni-app', () => ({
  onLoad: (callback: typeof hooks.load) => (hooks.load = callback),
  onShow: (callback: typeof hooks.show) => (hooks.show = callback),
  onHide: (callback: typeof hooks.hide) => (hooks.hide = callback),
  onUnload: (callback: typeof hooks.unload) => (hooks.unload = callback)
}))

import { usePageShareEntry } from '@/composables/use-page-share-entry'
import { runtimeMode } from '@/services/runtime-mode'

beforeEach(() => {
  vi.stubGlobal('uni', { switchTab: vi.fn() })
})
afterEach(() => {
  hooks.unload?.()
  runtimeMode.update({ apiCategory: 'default' })
  vi.unstubAllGlobals()
})

it('opens home once for a generic timeline entry in the full app', () => {
  usePageShareEntry()
  hooks.load?.({ target: 'home', id: 'sender-feedback', return: 'private-edit' })
  hooks.show?.()
  hooks.show?.()
  expect(uni.switchTab).toHaveBeenCalledExactlyOnceWith({ url: '/pages/home/index' })
})

it('keeps ordinary page navigation and existing content shares on their own routes', () => {
  usePageShareEntry()
  for (const query of [{}, { target: 'scene', id: 'card-1' }, { target: 'learning' }]) {
    hooks.load?.(query)
    hooks.show?.()
  }
  expect(uni.switchTab).not.toHaveBeenCalled()
})

it('releases the business guard when a cached tab is opened again after landing on home', () => {
  const entry = usePageShareEntry()
  hooks.load?.({ target: 'home' })
  hooks.show?.()
  expect(entry.value).toBe(true)
  hooks.hide?.()
  hooks.show?.()
  expect(entry.value).toBe(false)
  expect(uni.switchTab).toHaveBeenCalledTimes(1)
})

it('retains the browse-only summary until the visible page enters the full app', async () => {
  runtimeMode.update({ apiCategory: 'browseOnly' })
  usePageShareEntry()
  hooks.load?.({ target: 'home' })
  hooks.show?.()
  expect(uni.switchTab).not.toHaveBeenCalled()
  runtimeMode.update({ apiCategory: 'default' })
  await nextTick()
  expect(uni.switchTab).toHaveBeenCalledExactlyOnceWith({ url: '/pages/home/index' })
})

it('does not navigate a hidden or unloaded page when the official mode changes', async () => {
  runtimeMode.update({ apiCategory: 'browseOnly' })
  usePageShareEntry()
  hooks.load?.({ target: 'home' })
  hooks.show?.()
  hooks.hide?.()
  runtimeMode.update({ apiCategory: 'default' })
  await nextTick()
  expect(uni.switchTab).not.toHaveBeenCalled()
  hooks.show?.()
  expect(uni.switchTab).toHaveBeenCalledTimes(1)
  hooks.load?.({ target: 'home' })
  hooks.unload?.()
  runtimeMode.update({ apiCategory: 'browseOnly' })
  await nextTick()
  runtimeMode.update({ apiCategory: 'default' })
  await nextTick()
  expect(uni.switchTab).toHaveBeenCalledTimes(1)
})
