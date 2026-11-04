import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, expect, it } from 'vitest'

const publisher = path.resolve('scripts/asset-publish.mjs')
const manifest = path.resolve('scripts/asset-manifest.mjs')
const roots: string[] = []
/** 创建固定逻辑名称夹具，root 为独立测试目录 */
const picture = (root: string, name = 'name', width = 10) => {
  const body = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="10"></svg>`
  )
  writeFileSync(path.join(root, `resources/oss/images/${name}.svg`), body)
  return body
}
/** 创建仅含资源的隔离目录 */
const fixture = () => {
  const root = mkdtempSync(path.join(tmpdir(), 'juya-map-'))
  roots.push(root)
  mkdirSync(path.join(root, 'resources/oss/images'), { recursive: true })
  return root
}
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })))

it('versions a stable source filename without requiring a rename', async () => {
  const { collectAssets } = await import(publisher)
  const root = fixture(),
    body = picture(root)
  const assets = collectAssets(root)
  expect(assets[0].source).toBe('images/name.svg')
  expect(assets[0].file).toBe(
    `images/name-${createHash('sha256').update(body).digest('hex').slice(0, 12)}.svg`
  )
  expect(assets[0].width).toBe(10)
})
it('keeps old maps locked while a replacement changes file, bytes and dimensions', async () => {
  const { collectAssetCatalog } = await import(manifest)
  const root = fixture()
  picture(root)
  const before = collectAssetCatalog(root)
  picture(root, 'name', 123)
  const after = collectAssetCatalog(root)
  expect(before.map['images/name.svg'].width).toBe(10)
  expect(after.map['images/name.svg'].width).toBe(123)
  expect(after.map['images/name.svg'].file).not.toBe(before.map['images/name.svg'].file)
  expect(after.map['images/name.svg'].bytes).not.toBe(before.map['images/name.svg'].bytes)
  expect(JSON.stringify(after.map)).not.toContain('<svg')
})
it('uploads only two additions and one replacement while keeping old objects', async () => {
  const { publishAssets } = await import(publisher)
  const root = fixture(),
    objects = new Map<string, Buffer>(),
    writes: string[] = []
  picture(root)
  const store = {
    get: async (key: string) => objects.get(key),
    put: async (asset: { key: string; body: Buffer }) => {
      writes.push(asset.key)
      objects.set(asset.key, asset.body)
    }
  }
  const readPublic = async (url: string) => ({
    body: objects.get(new URL(url).pathname.slice(1)),
    status: 200,
    contentType: 'image/svg+xml',
    cacheControl: 'max-age=31536000, immutable'
  })
  await publishAssets({ root, environment: 'test', store, readPublic })
  const oldKey = writes[0]
  writes.length = 0
  picture(root, 'name', 20)
  picture(root, 'second')
  picture(root, 'third')
  await publishAssets({ root, environment: 'test', store, readPublic })
  expect(writes).toHaveLength(3)
  expect(objects.has(oldKey)).toBe(true)
  writes.length = 0
  await publishAssets({ root, environment: 'test', store, readPublic })
  expect(writes).toHaveLength(0)
})
it('blocks all remote access when a source changes after compilation', async () => {
  const { writeBuildManifest } = await import(manifest)
  const { publishAssets } = await import(publisher)
  const root = fixture(),
    file = path.join(root, 'dist/build-map.json')
  picture(root)
  writeBuildManifest(root, file)
  picture(root, 'name', 20)
  let accessed = false
  await expect(
    publishAssets({
      root,
      environment: 'test',
      manifestFile: file,
      store: {
        get: async () => {
          accessed = true
        }
      }
    })
  ).rejects.toThrow(/构建.*改变/)
  expect(accessed).toBe(false)
})
it('merges aliases of the same versioned remote file', async () => {
  const { collectAssetCatalog } = await import(manifest)
  const root = fixture(),
    body = picture(root)
  const hash = createHash('sha256').update(body).digest('hex').slice(0, 12)
  writeFileSync(path.join(root, `resources/oss/images/name-${hash}.svg`), body)
  const catalog = collectAssetCatalog(root)
  expect(catalog.assets).toHaveLength(1)
  expect(catalog.map['images/name.svg']).toEqual(catalog.map[`images/name-${hash}.svg`])
})
