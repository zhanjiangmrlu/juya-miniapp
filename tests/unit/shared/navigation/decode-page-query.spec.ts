import { describe, expect, it } from 'vitest'

import { decodePageQuery } from '@/shared/navigation/decode-page-query'

describe('微信页面路由解码', () => {
  it.each([
    [undefined, ''],
    ['vocabulary:word', 'vocabulary:word'],
    ['vocabulary%3Aword', 'vocabulary:word'],
    ['sentence%3As2%3Aentry%3Aword', 'sentence:s2:entry:word'],
    ['literal%253Avalue', 'literal%3Avalue'],
    ['invalid%locator', 'invalid%locator']
  ])('保留空值和原始值，编码值仅解码一次：%s', (input, expected) => {
    expect(decodePageQuery(input)).toBe(expected)
  })
})
