import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

import { expect, it } from 'vitest'

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Connect, ViteDevServer } from 'vite'

import { designAssetFile } from '../../../build/local-design-assets'
it('serves only explicit local design assets, never configuration or traversal', () => {
  expect(designAssetFile('/design-assets/backgrounds/scene-window.png')).toContain(
    'resources/oss/backgrounds/scene-window.png'
  )
  const home = designAssetFile('/design-assets/listening/home-watercolor-42627c088d7e@3x.jpg')
  expect(home).toBeDefined()
  expect(createHash('sha256').update(readFileSync(home!)).digest('hex').slice(0, 12)).toBe(
    '42627c088d7e'
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

it('serves compressed artwork and CSS paper with their actual media types', async () => {
  const { localDesignAssetsPlugin } = await import('../../../build/local-design-assets')
  const plugin = localDesignAssetsPlugin()
  const handlers: Connect.NextHandleFunction[] = []
  if (typeof plugin.configureServer !== 'function') throw new Error('Missing asset middleware')
  plugin.configureServer({
    watcher: { add: () => {}, on: () => {} },
    middlewares: { use: (callback: Connect.NextHandleFunction) => handlers.push(callback) }
  } as unknown as ViteDevServer)
  for (const [path, type] of [
    ['scene-window-1816629a6ee2.webp', 'image/webp'],
    ['paper-texture-ee39e121f9c3.jpg', 'image/jpeg'],
    ['scene-window.png', 'image/png']
  ]) {
    const headers = new Map()
    let payload: Buffer | undefined
    let skipped = false
    handlers[0](
      { url: `/design-assets/backgrounds/${path}`, method: 'GET' } as IncomingMessage,
      {
        setHeader: (name: string, value: string) => headers.set(name, value),
        end: (body: Buffer) => (payload = body)
      } as unknown as ServerResponse,
      () => (skipped = true)
    )
    expect(skipped).toBe(false)
    expect(headers.get('Content-Type')).toBe(type)
    expect(payload?.length).toBeGreaterThan(0)
  }
})

it('serves a canonical version path before a colliding logical alias', async () => {
  const { createAssetPreviewIndex } = await import('../../../build/local-design-assets')
  const index = createAssetPreviewIndex({
    assets: [],
    sources: {},
    map: {
      'images/name.svg': { file: 'images/name-111111111111.svg', bytes: 1 },
      'images/name-111111111111.svg': { file: 'images/name-222222222222.svg', bytes: 2 }
    }
  })
  expect(index.get('images/name-111111111111.svg')).toBe('images/name.svg')
  expect(index.get('images/name-222222222222.svg')).toBe('images/name-111111111111.svg')
})
