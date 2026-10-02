import { describe, expect, it } from 'vitest'

import { resolveNavigationMetrics } from './navigation-metrics'

describe('自定义导航尺寸', () => {
  it('根据实际微信胶囊边界计算导航和右侧避让', () => {
    expect(
      resolveNavigationMetrics(
        24,
        { top: 32, bottom: 64, left: 280, right: 367, width: 87, height: 32 },
        390
      )
    ).toEqual({ top: 24, height: 48, right: 110 })
  })

  it('缺少或无效胶囊时使用可读的H5导航尺寸', () => {
    expect(resolveNavigationMetrics(0, undefined, 390).top).toBe(30)
    expect(resolveNavigationMetrics(undefined, undefined, 390)).toEqual({
      top: 30,
      height: 48,
      right: 110
    })
    expect(
      resolveNavigationMetrics(
        0,
        { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 },
        390
      ).height
    ).toBe(48)
  })
})
