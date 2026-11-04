import { expect, it } from 'vitest'

import { assetInfo, assetUrl } from '@/services/asset-url'

it('resolves the stable home name using this build version and the selected asset root', () => {
  expect(assetUrl('listening/home-watercolor@3x.jpg')).toBe(
    'https://juya-test.oss-cn-shenzhen.aliyuncs.com/miniapp/static/listening/home-watercolor-42627c088d7e@3x.jpg'
  )
  expect(assetUrl('listening/home-watercolor@3x.jpg', '/design-assets/')).toBe(
    '/design-assets/listening/home-watercolor-42627c088d7e@3x.jpg'
  )
  expect(assetInfo('listening/home-watercolor@3x.jpg')?.bytes).toBe(185176)
})
it.each([
  '__proto__',
  'constructor',
  '../private.png',
  'missing.png',
  'https://other.example/image.png'
])('does not guess a remote image URL for an unknown key %s', (key) => {
  expect(assetUrl(key)).toBe('')
  expect(assetInfo(key)).toBeUndefined()
})
