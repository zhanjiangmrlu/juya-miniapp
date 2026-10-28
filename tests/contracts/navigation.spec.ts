import { readFileSync } from 'node:fs'

import { expect, it } from 'vitest'
it('ships home, shared learning records and account as three bottom tabs', () => {
  const configuration = JSON.parse(
    readFileSync(new URL('../../src/pages.json', import.meta.url), 'utf8')
  )
  expect(configuration.tabBar.list.map((tab: { text: string }) => tab.text)).toEqual([
    '首页',
    '学习记录',
    '账号'
  ])
  expect(configuration.tabBar.list.map((tab: { pagePath: string }) => tab.pagePath)).toEqual([
    'pages/home/index',
    'pages/records/index',
    'pages/profile/index'
  ])
  expect(configuration.pages[0].path).toBe('pages/home/index')
})
