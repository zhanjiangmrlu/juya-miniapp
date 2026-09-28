import { describe, expect, it } from 'vitest'

import { resolveLegacyRoute } from './legacy-routes'

describe('resolveLegacyRoute', () => {
  it('M04 回到首页并打开网络异常状态', () => {
    expect(resolveLegacyRoute({ pageId: 'M04' })).toEqual({
      type: 'reLaunch',
      url: '/pages/home/index?networkError=1'
    })
  })

  it('M10 和 M11 回到原场景稳定位置并打开对应弹层', () => {
    expect(
      resolveLegacyRoute({ pageId: 'M10', sceneId: 'scene-1', sourceLocator: 'sentence-2' })
    ).toEqual({
      type: 'redirectTo',
      url: '/pages/scene/dialogue?sceneId=scene-1&sourceLocator=sentence-2&sheet=vocabulary'
    })
    expect(resolveLegacyRoute({ pageId: 'M11', sceneId: 'scene-1' })).toEqual({
      type: 'redirectTo',
      url: '/pages/scene/dialogue?sceneId=scene-1&sheet=phrase'
    })
  })

  it('M26 替换到唯一学习档案', () => {
    expect(resolveLegacyRoute({ pageId: 'M26' })).toEqual({
      type: 'reLaunch',
      url: '/pages/profile/index'
    })
  })

  it('未知兼容页面回到首页安全入口', () => {
    expect(resolveLegacyRoute({ pageId: 'M99' })).toEqual({
      type: 'reLaunch',
      url: '/pages/home/index'
    })
  })
})
