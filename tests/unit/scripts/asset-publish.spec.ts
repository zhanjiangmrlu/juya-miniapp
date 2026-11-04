import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, expect, it } from 'vitest'

const script = path.resolve('scripts/asset-publish.mjs')
const roots: string[] = []
/** 创建隔离资源，content 为待发布图片内容 */
const fixture = (content = 'image-one') => {
  const root = mkdtempSync(path.join(tmpdir(), 'juya-assets-'))
  roots.push(root)
  mkdirSync(path.join(root, 'resources/oss/images'), { recursive: true })
  const body = Buffer.from(content)
  const sha = createHash('sha256').update(body).digest('hex')
  const file = `images/art-${sha.slice(0, 12)}@3x.jpg`
  writeFileSync(path.join(root, 'resources/oss', file), body)
  return { root, file, body }
}
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })))

it.each(['test', 'production'])(
  'publishes new assets once and verifies the correct %s public host',
  async (environment) => {
    const { publishAssets } = await import(script)
    const f = fixture()
    const objects = new Map<string, Buffer>()
    const writes: string[] = []
    let mirrored = 0
    const store = {
      get: async (key: string) => objects.get(key),
      put: async (asset: { key: string; body: Buffer }) => {
        writes.push(asset.key)
        objects.set(asset.key, asset.body)
      }
    }
    const mirror = async () => {
      mirrored++
    }
    const readPublic = async (url: string) => {
      expect(url).toBe(
        `${environment === 'test' ? 'https://juya-test.oss-cn-shenzhen.aliyuncs.com' : 'https://api.juyayingyu.com'}/miniapp/static/${f.file}`
      )
      return {
        body: f.body,
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=31536000, immutable',
        status: 200
      }
    }
    const first = await publishAssets({ root: f.root, environment, store, mirror, readPublic })
    const second = await publishAssets({ root: f.root, environment, store, mirror, readPublic })
    expect(first.bucket).toBe(environment === 'test' ? 'juya-test' : 'juya')
    expect(first.entries[0].status).toBe('uploaded')
    expect(second.entries[0].status).toBe('skipped')
    expect(writes).toEqual([`miniapp/static/${f.file}`])
    expect(mirrored).toBe(environment === 'production' ? 2 : 0)
  }
)

it('rejects conflicting objects without overwriting or exposing upstream secrets', async () => {
  const { publishAssets } = await import(script)
  const f = fixture()
  let wrote = false
  await expect(
    publishAssets({
      root: f.root,
      environment: 'test',
      store: {
        get: async () => Buffer.from('other'),
        put: async () => {
          wrote = true
        }
      }
    })
  ).rejects.toThrow(/冲突/)
  expect(wrote).toBe(false)
  await expect(
    publishAssets({
      root: f.root,
      environment: 'test',
      store: {
        get: async () => {
          throw new Error('sensitive-token')
        }
      }
    })
  ).rejects.not.toThrow(/sensitive-token/)
})

it('accepts a concurrent immutable create only after re-reading the exact content', async () => {
  const { publishAssets } = await import(script)
  const f = fixture()
  let exists = false
  const result = await publishAssets({
    root: f.root,
    environment: 'test',
    store: {
      get: async () => (exists ? f.body : undefined),
      put: async () => {
        exists = true
        throw Object.assign(new Error('race'), { code: 'FileAlreadyExists' })
      }
    },
    readPublic: async () => ({
      body: f.body,
      contentType: 'image/jpeg',
      cacheControl: 'max-age=31536000, immutable',
      status: 200
    })
  })
  expect(result.entries).toHaveLength(1)
  expect(result.entries[0].status).toBe('skipped')
})

it('blocks release when the public route returns the wrong content', async () => {
  const { publishAssets } = await import(script)
  const f = fixture()
  await expect(
    publishAssets({
      root: f.root,
      environment: 'production',
      store: { get: async () => f.body },
      mirror: async () => {},
      readPublic: async () => ({
        body: Buffer.from('wrong'),
        status: 200,
        contentType: 'image/jpeg',
        cacheControl: 'immutable, max-age=31536000'
      })
    })
  ).rejects.toThrow(/访问校验/)
})

it('rejects invalid names, content hashes, environments and symlinks before uploading', async () => {
  const { collectAssets, publishAssets } = await import(script)
  const f = fixture()
  writeFileSync(path.join(f.root, 'resources/oss', f.file), 'modified')
  expect(() => collectAssets(f.root)).toThrow(/哈希/)
  await expect(publishAssets({ root: f.root, environment: 'development' })).rejects.toThrow(/环境/)
  const g = fixture()
  symlinkSync(
    path.join(g.root, 'resources/oss', g.file),
    path.join(g.root, 'resources/oss/link.jpg')
  )
  expect(() => collectAssets(g.root)).toThrow(/符号链接/)
})

it('does not expose malformed private JSON and refuses changed historical originals', async () => {
  const { collectAssets, publishAssets } = await import(script)
  const f = fixture()
  mkdirSync(path.join(f.root, '.private'))
  writeFileSync(
    path.join(f.root, '.private/asset-publish.local.json'),
    '{"accessKeySecret":"do-not-print-this"'
  )
  await expect(publishAssets({ root: f.root, environment: 'test' })).rejects.toThrow(
    'OSS私有配置读取或格式校验失败'
  )
  writeFileSync(
    path.join(f.root, 'resources/oss/publish-archive.json'),
    JSON.stringify({ [f.file]: '0'.repeat(64) })
  )
  expect(() => collectAssets(f.root)).toThrow(/历史原图/)
})
it('ignores resource metadata and rejects unversioned newly added pictures', async () => {
  const { collectAssets } = await import(script)
  const f = fixture()
  writeFileSync(path.join(f.root, 'resources/oss/notes.md'), 'documentation')
  writeFileSync(path.join(f.root, 'resources/oss/manifest.json'), '{}')
  expect(collectAssets(f.root)).toHaveLength(1)
  writeFileSync(path.join(f.root, 'resources/oss/new.jpg'), 'new')
  expect(() => collectAssets(f.root)).toThrow(/哈希/)
})
