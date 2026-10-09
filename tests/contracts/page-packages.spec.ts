import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { normalizePageUrl } from '@/shared/navigation/page-url'

const expectedPackages = {
  home: ['first-visit', 'today-task'],
  learning: ['index', 'explore', 'no-access'],
  scene: [
    'detail',
    'dialogue',
    'vocabulary',
    'chunks',
    'audio-failed',
    'restore-position',
    'return-source',
    'shadowing',
    'completed'
  ],
  favorites: ['index', 'phrases', 'detail', 'sources', 'review-front', 'review-back', 'history'],
  profile: ['index', 'contact-prompt', 'contact-edit', 'contact-manage', 'contact-correction'],
  entitlement: ['index', 'pending', 'active', 'ending', 'ended', 'exception'],
  feedback: ['messages', 'index', 'create', 'detail', 'resolution', 'content-blocked'],
  account: ['index', 'clear-confirm', 'delete-confirm', 'deletion-pending'],
  compat: ['index']
}
const config = JSON.parse(readFileSync(resolve('src/pages.json'), 'utf8')) as {
  pages: Array<{ path: string; style: { navigationStyle: string } }>
  subPackages?: Array<{
    root: string
    independent?: boolean
    pages: Array<{ path: string; style: { navigationStyle: string } }>
  }>
  preloadRule?: unknown
}

describe('页面分包配置', () => {
  it('43 个旧地址完整映射至新路由，原始参数不会再次编码', () => {
    for (const [business, pages] of Object.entries(expectedPackages)) {
      for (const page of pages) {
        expect(normalizePageUrl(`/pages/${business}/${page}?id=a%2Fb&from=history`)).toBe(
          `/sub-packages/${business}/${page}?id=a%2Fb&from=history`
        )
      }
    }
  })
  it('主包仅保留首页，43 个页面按业务完整注册到 9 个普通子包', () => {
    expect(config.pages.map((page) => page.path)).toEqual(['pages/home/index'])
    expect(config.subPackages).toHaveLength(9)
    expect(config.preloadRule).toBeUndefined()
    for (const [business, names] of Object.entries(expectedPackages)) {
      const subpackage = config.subPackages?.find(
        (item) => item.root === `sub-packages/${business}`
      )
      expect(subpackage?.pages.map((page) => page.path)).toEqual(names)
      expect(subpackage?.independent).not.toBe(true)
    }
    expect(config.subPackages?.flatMap((item) => item.pages)).toHaveLength(43)
  })

  it('44 条路由唯一、源文件存在，页面样式与迁移前一致', () => {
    const pages = [
      ...config.pages,
      ...(config.subPackages ?? []).flatMap((item) =>
        item.pages.map((page) => ({ ...page, path: `${item.root}/${page.path}` }))
      )
    ]
    expect(pages).toHaveLength(44)
    expect(new Set(pages.map((page) => page.path)).size).toBe(44)
    for (const page of pages) {
      expect(existsSync(resolve(`src/${page.path}.vue`)), page.path).toBe(true)
      expect(page.style).toEqual({ navigationStyle: 'custom' })
    }
    const mainFiles = readdirSync(resolve('src/pages'), { recursive: true })
      .filter((file) => String(file).endsWith('.vue'))
      .map((file) => String(file).replace(/\\/g, '/'))
    expect(mainFiles).toEqual(['home/index.vue'])
  })
})
