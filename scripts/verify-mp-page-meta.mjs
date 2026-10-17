import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../dist/build/mp-weixin/', import.meta.url))
const configuration = JSON.parse(readFileSync(path.join(root, 'app.json'), 'utf8'))
assert.deepEqual(
  configuration.tabBar.list.map((item) => [item.text, item.pagePath]),
  [
    ['学习', 'pages/learning/index'],
    ['收藏', 'pages/favorites/index']
  ]
)
const pages = [
  ...configuration.pages,
  ...(configuration.subPackages || []).flatMap((group) =>
    group.pages.map((page) => `${group.root}/${page}`)
  )
]
for (const page of pages) {
  const file = path.join(root, `${page}.json`)
  assert.ok(existsSync(file), `Missing page configuration: ${page}`)
  assert.equal(
    JSON.parse(readFileSync(file, 'utf8')).navigationStyle,
    'custom',
    `Unexpected native header: ${page}`
  )
}
console.info(`Verified ${pages.length} page configurations and two bottom tabs`)
