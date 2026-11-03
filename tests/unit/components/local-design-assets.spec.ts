import { expect, it } from 'vitest'

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Connect, ViteDevServer } from 'vite'

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

it('serves compressed artwork and CSS paper with their actual media types', async () => {
  const { localDesignAssetsPlugin } = await import('../../../build/local-design-assets')
  const plugin = localDesignAssetsPlugin()
  const handlers: Connect.NextHandleFunction[] = []
  if (typeof plugin.configureServer !== 'function') throw new Error('Missing asset middleware')
  plugin.configureServer({
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
