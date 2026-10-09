// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick, ref } from 'vue'

import { useWechatShare } from '@/shared/use-wechat-share'

const deps = vi.hoisted(() => ({
  show: undefined as (() => void) | undefined,
  hide: undefined as (() => void) | undefined,
  unload: undefined as (() => void) | undefined,
  track: vi.fn(),
  landing: vi.fn(),
  load: undefined as ((query?: Record<string, string>) => void) | undefined,
  showMenu: vi.fn(),
  hideMenu: vi.fn()
}))
vi.mock('@dcloudio/uni-app', () => ({
  onLoad: (callback: (query?: Record<string, string>) => void) => (deps.load = callback),
  onShow: (callback: () => void) => (deps.show = callback),
  onHide: (callback: () => void) => (deps.hide = callback),
  onUnload: (callback: () => void) => (deps.unload = callback)
}))
vi.mock('@/services/analytics/runtime', () => ({
  getAnalytics: () => ({ ...deps, shareLanding: deps.landing })
}))

/** 挂载分享组合函数，options 为首页或场景的公开分享配置 */
const setupShare = (options: Parameters<typeof useWechatShare>[0]) => {
  const hooks = { onShareAppMessage: vi.fn(), onShareTimeline: vi.fn() }
  const wrapper = mount(
    defineComponent({
      setup: () => {
        useWechatShare(options, hooks)
        return () => null
      }
    })
  )
  return {
    wrapper,
    friend: hooks.onShareAppMessage.mock.calls[0][0],
    timeline: hooks.onShareTimeline.mock.calls[0][0]
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('uni', { showShareMenu: deps.showMenu, hideShareMenu: deps.hideMenu })
})

describe('统一微信分享', () => {
  it('首页好友与朋友圈只生成固定参数，使用显式公开封面而非页面截图', () => {
    const { wrapper, friend, timeline } = setupShare({ target: 'home' })
    deps.show?.()
    deps.load?.({ share_channel: 'friend', share_target: 'home' })
    expect(deps.landing).toHaveBeenCalledWith({
      path: 'pages/home/index',
      query: { share_channel: 'friend', share_target: 'home' }
    })
    expect(deps.showMenu).toHaveBeenCalledWith(
      expect.objectContaining({
        menus: ['shareAppMessage', 'shareTimeline'],
        fail: expect.any(Function)
      })
    )
    expect(friend({ from: 'button' })).toEqual({
      title: '句芽英语｜从真实场景开始，自然开口说英语',
      path: '/pages/home/index?share_channel=friend&share_target=home',
      imageUrl: '/static/share/juya-share@3x.png'
    })
    expect(timeline()).toEqual({
      title: '句芽英语｜从真实场景开始，自然开口说英语',
      query: 'share_channel=timeline&share_target=home',
      imageUrl: '/static/share/juya-share@3x.png'
    })
    expect(deps.track).toHaveBeenCalledWith('share_initiate', {
      page_code: 'pages/home/index',
      share_channel: 'friend',
      share_target: 'home',
      entry_source: 'button'
    })
    expect(deps.track).toHaveBeenCalledTimes(2)
    expect(friend({ from: 'menu' })).not.toHaveProperty('success')
    wrapper.unmount()
  })

  it('场景未加载及离开不记分享，更新后只携带安全标题与内容 ID', async () => {
    const scene = ref<{ sceneId: string; title: string } | undefined>()
    const { wrapper, friend, timeline } = setupShare({ target: 'scene', scene: () => scene.value })
    deps.load?.({ sceneId: 'coffee' })
    deps.show?.()
    expect(deps.hideMenu).toHaveBeenCalled()
    expect(friend({ from: 'menu' }).path).toContain('/pages/home/index?')
    expect(deps.track).not.toHaveBeenCalled()
    scene.value = { sceneId: 'coffee', title: '在咖啡店' }
    await nextTick()
    expect(deps.showMenu).toHaveBeenCalled()
    expect(friend({ from: 'menu' }).path).toBe(
      '/sub-packages/scene/detail?share_channel=friend&share_target=scene&sceneId=coffee'
    )
    expect(timeline().query).toBe('share_channel=timeline&share_target=scene&sceneId=coffee')
    expect(deps.track).toHaveBeenLastCalledWith(
      'share_initiate',
      expect.objectContaining({ content_scene_id: 'coffee', share_channel: 'timeline' })
    )
    scene.value = undefined
    await nextTick()
    expect(timeline().query).toBe('share_channel=timeline&share_target=scene&sceneId=coffee')
    expect(deps.track).toHaveBeenCalledTimes(2)
    deps.hide?.()
    friend({ from: 'button' })
    expect(deps.track).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })

  it('非法场景与微信菜单异常不会泄露查询参数或阻止分享', () => {
    deps.showMenu.mockImplementationOnce(() => {
      throw new Error('unsupported')
    })
    const home = setupShare({ target: 'home' })
    expect(() => deps.show?.()).not.toThrow()
    expect(home.friend({ from: 'menu' }).path).toContain('/pages/home/index?')
    home.wrapper.unmount()
    const invalid = setupShare({
      target: 'scene',
      scene: () => ({ sceneId: 'coffee&token=secret', title: 'private' })
    })
    deps.show?.()
    expect(invalid.friend({ from: 'menu' }).path).not.toContain('secret')
    invalid.wrapper.unmount()
  })
})
