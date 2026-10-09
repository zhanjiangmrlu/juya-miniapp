import { afterEach, describe, expect, it, vi } from 'vitest'

import { ROUTES } from '@/shared/constants/navigation'
import { navigate } from '@/shared/navigation/navigate'

afterEach(() => vi.unstubAllGlobals())

describe('子包导航', () => {
  it.each(['navigateTo', 'redirectTo', 'reLaunch'] as const)(
    '%s 将既有页面链接迁移至子包并原样保留查询参数',
    async (type) => {
      let destination = ''
      vi.stubGlobal('uni', {
        [type]: (options: { url: string; success: () => void }) => {
          destination = options.url
          options.success()
        }
      })
      await navigate({
        type,
        url: '/pages/scene/dialogue?sceneId=a%2Fb&sourceLocator=x%26y&sheet=vocabulary#sentence'
      })
      expect(destination).toBe(
        '/sub-packages/scene/dialogue?sceneId=a%2Fb&sourceLocator=x%26y&sheet=vocabulary#sentence'
      )
    }
  )

  it.each([
    '/pages/home/index?networkError=1',
    '/pages/learning/index?from=home',
    '/pages/favorites/index?tab=phrases#bank',
    '/pages/profile/index',
    '/sub-packages/scene/detail?sceneId=one',
    '/pages/scene/unknown?sceneId=one',
    'https://example.com/pages/scene/detail',
    '/scenes/one'
  ])('首页、新地址和未知地址不改写：%s', async (url) => {
    let destination = ''
    vi.stubGlobal('uni', {
      navigateTo: (options: { url: string; success: () => void }) => {
        destination = options.url
        options.success()
      }
    })
    await navigate({ type: 'navigateTo', url })
    expect(destination).toBe(url)
  })

  it('底部四个一级入口和启动相关路由使用新的页面归属', () => {
    expect(ROUTES.home).toBe('/pages/home/index')
    expect(ROUTES.learning).toBe('/pages/learning/index')
    expect(ROUTES.favorites).toBe('/pages/favorites/index')
    expect(ROUTES.profile).toBe('/pages/profile/index')
    expect(ROUTES.compat).toBe('/sub-packages/compat/index')
  })

  it.each(['learning', 'favorites', 'profile'])(
    '兼容 %s 一级页面的旧子包地址',
    async (business) => {
      let destination = ''
      vi.stubGlobal('uni', {
        reLaunch: (options: { url: string; success: () => void }) => {
          destination = options.url
          options.success()
        }
      })
      await navigate({
        type: 'reLaunch',
        url: `/sub-packages/${business}/index?from=a%2Fb&tab=phrases#section`
      })
      expect(destination).toBe(`/pages/${business}/index?from=a%2Fb&tab=phrases#section`)
    }
  )

  it('导航失败仍向调用方传递错误', async () => {
    const failure = new Error('load failed')
    vi.stubGlobal('uni', {
      navigateTo: (options: { fail: (error: Error) => void }) => options.fail(failure)
    })
    await expect(navigate({ type: 'navigateTo', url: '/pages/scene/detail' })).rejects.toBe(failure)
  })
})
