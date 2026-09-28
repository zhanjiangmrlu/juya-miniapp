import { describe, expect, it } from 'vitest'

import { getBeijingGreeting } from './beijing-time'

describe('getBeijingGreeting', () => {
  it.each([
    ['2026-09-28T00:00:00.000Z', '早上好'],
    ['2026-09-28T05:00:00.000Z', '下午好'],
    ['2026-09-28T13:00:00.000Z', '晚上好']
  ])('按北京时间为 %s 返回 %s', (time, greeting) => {
    expect(getBeijingGreeting(new Date(time))).toBe(greeting)
  })
})
