import { describe, expect, it } from 'vitest'

import { APP_META } from '@/shared/constants/app-meta'

describe('APP_META', () => {
  it('提供应用壳使用的产品标识', () => {
    expect(APP_META).toEqual({
      description: '从真实场景开始，自然开口说英语',
      name: '句芽英语'
    })
  })
})
