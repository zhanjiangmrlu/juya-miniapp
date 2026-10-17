import { readFileSync } from 'node:fs'

import { expect, it } from 'vitest'
it('ships only learning and whole-card favorites as bottom tabs', () => {
  const configuration = JSON.parse(
    readFileSync(new URL('../../src/pages.json', import.meta.url), 'utf8')
  )
  expect(configuration.tabBar.list.map((tab: { text: string }) => tab.text)).toEqual([
    '学习',
    '收藏'
  ])
  expect(configuration.tabBar.list.map((tab: { pagePath: string }) => tab.pagePath)).toEqual([
    'pages/learning/index',
    'pages/favorites/index'
  ])
  expect(configuration.pages[0].path).toBe('pages/learning/index')
})
