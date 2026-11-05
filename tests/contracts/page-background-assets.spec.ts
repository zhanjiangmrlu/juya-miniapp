import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { expect, it } from 'vitest'

import { PAGE_BACKGROUNDS } from '@/shared/constants/ui'

const directory = new URL('../../resources/oss/backgrounds/', import.meta.url)
const manifest = JSON.parse(readFileSync(new URL('manifest.json', directory), 'utf8'))

it('keeps the delivered PNGs intact and loads hashed variants within the page download budget', () => {
  expect(manifest.assets).toHaveLength(6)
  for (const asset of manifest.assets) {
    const original = readFileSync(new URL(asset.file, directory))
    expect(createHash('sha256').update(original).digest('hex')).toBe(asset.sha256)
    expect(original.length).toBe(asset.bytes)
    expect([original.readUInt32BE(16), original.readUInt32BE(20)]).toEqual([853, 1844])
    expect(asset.variant, `compressed variant missing for ${asset.file}`).toBeDefined()
    const variant = readFileSync(new URL(asset.variant.file, directory))
    const digest = createHash('sha256').update(variant).digest('hex')
    expect(asset.variant.file).toContain(digest.slice(0, 12))
    expect(asset.variant.sha256).toBe(digest)
    expect(asset.variant.bytes).toBe(variant.length)
    expect(variant.length).toBeLessThanOrEqual(100 * 1024)
    expect(Object.values(PAGE_BACKGROUNDS)).toContain(asset.variant.file)
    if (asset.file === 'paper-texture.png') {
      expect(variant.subarray(0, 3).toString('hex')).toBe('ffd8ff')
    } else {
      expect(variant.subarray(0, 4).toString()).toBe('RIFF')
      expect(variant.subarray(8, 12).toString()).toBe('WEBP')
    }
  }
  const paper = manifest.assets.find(
    (asset: { file: string }) => asset.file === 'paper-texture.png'
  )
  for (const asset of manifest.assets) {
    expect(asset.variant.bytes + paper.variant.bytes).toBeLessThanOrEqual(160 * 1024)
    expect(fileURLToPath(new URL(asset.variant.file, directory))).not.toContain('/src/static/')
  }
})

it('archives the exact home artwork outside the package under its content hash', () => {
  const directory = new URL('../../resources/oss/listening/', import.meta.url)
  const asset = JSON.parse(
    readFileSync(new URL('home-background-manifest.json', directory), 'utf8')
  )
  const data = readFileSync(new URL(asset.file, directory))
  const digest = createHash('sha256').update(data).digest('hex')
  expect(data.length).toBe(185176)
  expect(asset.bytes).toBe(data.length)
  expect(asset.sha256).toBe(digest)
  expect(asset.file).toContain(digest.slice(0, 12))
})
