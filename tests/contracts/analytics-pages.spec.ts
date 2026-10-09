import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const manifest = JSON.parse(readFileSync(resolve('src/pages.json'), 'utf8')) as {
  pages: { path: string }[]
  subPackages: { root: string; pages: { path: string }[] }[]
}
const routes = [
  ...manifest.pages.map((page) => page.path),
  ...manifest.subPackages.flatMap((pack) => pack.pages.map((page) => `${pack.root}/${page.path}`))
]

describe('全路由页面统计入口', () => {
  it.each(routes)('%s 恰好注册一次静态路由统计，不依赖业务组件', (route) => {
    const source = readFileSync(resolve(`src/${route}.vue`), 'utf8')
    expect(source.match(/useAnalyticsPage\('/g)).toHaveLength(1)
    expect(source).toContain(`useAnalyticsPage('${route}')`)
  })
})
