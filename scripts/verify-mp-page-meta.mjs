import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const output = path.resolve(process.argv[2] || 'dist/build/mp-weixin')
const pages = new Set(JSON.parse(readFileSync(path.join(output, 'app.json'), 'utf8')).pages)
const failures = []
let checked = 0

/** 检查编译后页面的原生节点约束，directory 为待遍历的微信构建目录 */
const inspect = (directory) => {
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, item.name)
    if (item.isDirectory()) {
      inspect(file)
      continue
    }
    if (!item.name.endsWith('.wxml')) continue
    const wxml = readFileSync(file, 'utf8')
    const metas = [...wxml.matchAll(/<page-meta\b([^>]*)>/g)]
    if (!metas.length) continue
    checked++
    const route = path
      .relative(output, file)
      .replaceAll('\\', '/')
      .replace(/\.wxml$/, '')
    if (!pages.has(route)) failures.push(`${route}: page-meta 出现在自定义组件内`)
    if (metas.length !== 1 || !/^\s*<page-meta\b/.test(wxml))
      failures.push(`${route}: page-meta 必须唯一且为首节点`)
    if (metas.some((meta) => /\bwx:(?:if|elif|else|for)\b/.test(meta[1])))
      failures.push(`${route}: page-meta 不能动态渲染`)
  }
}
inspect(output)
assert.ok(checked >= 10, '弹窗涉及的页面必须包含原生滚动控制节点')
assert.deepEqual(failures, [], failures.join('\n'))
process.stdout.write(`通过：${checked} 个页面的 page-meta 均为固定首节点，组件内没有 page-meta\n`)
