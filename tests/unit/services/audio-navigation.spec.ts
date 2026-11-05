import { afterEach, expect, it, vi } from 'vitest'

import { registerBackgroundAudioNavigation } from '@/services/audio-navigation'

afterEach(() => vi.unstubAllGlobals())

it('stops only the captured session after successful navigation and preserves failed navigation', () => {
  const interceptors: Record<
    string,
    { invoke: (options: { url?: string; success?: () => void }) => void }
  > = {}
  vi.stubGlobal('uni', {
    addInterceptor: (name: string, hooks: (typeof interceptors)[string]) => {
      interceptors[name] = hooks
    }
  })
  const leave = vi.fn(),
    nextLeave = vi.fn()
  const release = registerBackgroundAudioNavigation({ title: '', resume: async () => {}, leave })
  const failed = { url: '/pages/home/index' }
  interceptors.navigateTo!.invoke(failed)
  expect(leave).not.toHaveBeenCalled()
  const success = vi.fn(),
    navigation = { url: '/pages/home/index', success }
  interceptors.navigateTo!.invoke(navigation)
  navigation.success()
  expect(leave).toHaveBeenCalledTimes(1)
  expect(success).toHaveBeenCalledTimes(1)
  const pending = { success: vi.fn() }
  interceptors.navigateBack!.invoke(pending)
  const nextRelease = registerBackgroundAudioNavigation({
    title: '',
    resume: async () => {},
    leave: nextLeave
  })
  pending.success()
  release()
  expect(nextLeave).not.toHaveBeenCalled()
  nextRelease()
})

it('keeps scene audio through its image preview and back while stopping a later departure', () => {
  const interceptors: Record<
    string,
    { invoke: (options: { url?: string; success?: () => void }) => void }
  > = {}
  vi.stubGlobal('uni', {
    addInterceptor: (name: string, hooks: (typeof interceptors)[string]) => {
      interceptors[name] = hooks
    }
  })
  const leave = vi.fn()
  const release = registerBackgroundAudioNavigation({
    title: '',
    resume: async () => {},
    leave,
    keepOnNavigate: (url) => url.startsWith('/preview') || !url
  })
  const preview = { url: '/preview?id=one', success: vi.fn() }
  interceptors.navigateTo!.invoke(preview)
  preview.success()
  const back = { success: vi.fn() }
  interceptors.navigateBack!.invoke(back)
  back.success()
  expect(leave).not.toHaveBeenCalled()
  const home = { url: '/pages/home/index', success: vi.fn() }
  interceptors.switchTab!.invoke(home)
  home.success()
  expect(leave).toHaveBeenCalledOnce()
  release()
})
