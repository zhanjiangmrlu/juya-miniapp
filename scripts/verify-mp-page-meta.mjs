import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root = process.env.UNI_OUTPUT_DIR
  ? path.resolve(process.env.UNI_OUTPUT_DIR)
  : fileURLToPath(new URL('../dist/build/mp-weixin/', import.meta.url))
const configuration = JSON.parse(readFileSync(path.join(root, 'app.json'), 'utf8'))
assert.deepEqual(
  configuration.tabBar.list.map((item) => [item.text, item.pagePath]),
  [
    ['首页', 'pages/home/index'],
    ['学习记录', 'pages/records/index'],
    ['账号', 'pages/profile/index']
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
console.info(`Verified ${pages.length} page configurations and three bottom tabs`)
