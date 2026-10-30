import { expect, it } from 'vitest'

import { designAssetFile } from '../../../build/local-design-assets'
it('serves only explicit local design assets, never configuration or traversal', () => {
  expect(designAssetFile('/design-assets/backgrounds/scene-window.png')).toContain(
    'resources/oss/backgrounds/scene-window.png'
  )
  for (const path of [
    '/design-assets/../.env',
    '/design-assets/%2e%2e/.env',
    '/design-assets/backgrounds/manifest.json',
    '/design-assets/fonts/',
    '/src/main.ts'
  ])
    expect(designAssetFile(path)).toBeUndefined()
})
