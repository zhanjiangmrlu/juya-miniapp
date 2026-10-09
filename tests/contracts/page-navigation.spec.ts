// @vitest-environment happy-dom
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '@/App.vue'
import AppTabBar from '@/components/app-tab-bar/app-tab-bar.vue'

const dependencies = vi.hoisted(() => ({
  launch: undefined as (() => Promise<void>) | undefined,
  ensureSession: vi.fn(),
  profile: vi.fn(),
  session: { profile: undefined as unknown }
}))
vi.mock('@dcloudio/uni-app', () => ({
  onLaunch: (callback: () => Promise<void>) => {
    dependencies.launch = callback
  }
}))
vi.mock('@/services/runtime', () => ({
  getRuntimeServices: () => ({ profile: { get: dependencies.profile } })
}))
vi.mock('@/services/startup', () => ({ ensureSession: dependencies.ensureSession }))
vi.mock('@/stores/session', () => ({ useSessionStore: () => dependencies.session }))
enableAutoUnmount(afterEach)
afterEach(() => vi.unstubAllGlobals())
beforeEach(() => {
  vi.resetAllMocks()
  dependencies.launch = undefined
  dependencies.session.profile = undefined
})

describe('一级导航及启动期跨包入口', () => {
  it('四个底部入口使用 reLaunch，不改变切换方式', async () => {
    const destinations: string[] = []
    vi.stubGlobal('uni', {
      reLaunch: (options: { url: string }) => destinations.push(options.url)
    })
    const wrapper = mount(AppTabBar, { props: { active: 'home' } })
    for (const button of wrapper.findAll('button')) await button.trigger('click')
    expect(destinations).toEqual([
      '/pages/home/index',
      '/sub-packages/learning/index',
      '/sub-packages/favorites/index',
      '/sub-packages/profile/index'
    ])
  })

  it.each(['PENDING', 'PROCESSING'])('注销 %s 时冷启动进入新的子包页面', async (status) => {
    const destinations: string[] = []
    vi.stubGlobal('uni', {
      reLaunch: (options: { url: string }) => destinations.push(options.url)
    })
    dependencies.ensureSession.mockResolvedValue(true)
    const profile = { deletion: { status, effective_at: '2026-10-10T00:00:00Z' } }
    dependencies.profile.mockResolvedValue(profile)
    mount({ ...App, render: () => null })
    await dependencies.launch?.()
    expect(dependencies.session.profile).toEqual(profile)
    expect(destinations).toEqual(['/sub-packages/account/deletion-pending'])
  })
})
