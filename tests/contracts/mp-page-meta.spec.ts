import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

describe('微信 page-meta 分包校验', () => {
  it('识别子包页面，但仍拒绝组件内的 page-meta', () => {
    const output = mkdtempSync(join(tmpdir(), 'juya-page-meta-'))
    try {
      const subPages = Array.from({ length: 10 }, (_, index) => `page-${index}`)
      writeFileSync(
        join(output, 'app.json'),
        JSON.stringify({
          pages: ['pages/home/index'],
          subPackages: [{ root: 'sub-packages/scene', pages: subPages }]
        })
      )
      for (const page of subPages) {
        const file = join(output, 'sub-packages/scene', `${page}.wxml`)
        mkdirSync(dirname(file), { recursive: true })
        writeFileSync(file, '<page-meta page-style="overflow:auto"/><view/>')
      }
      const command = resolve('scripts/verify-mp-page-meta.mjs')
      const valid = spawnSync(process.execPath, [command, output], { encoding: 'utf8' })
      expect(valid.status, valid.stderr).toBe(0)
      expect(valid.stdout).toContain('10 个页面')
      mkdirSync(join(output, 'components'), { recursive: true })
      writeFileSync(join(output, 'components/invalid.wxml'), '<page-meta/><view/>')
      const invalid = spawnSync(process.execPath, [command, output], { encoding: 'utf8' })
      expect(invalid.status).not.toBe(0)
      expect(invalid.stderr).toContain('page-meta 出现在自定义组件内')
    } finally {
      rmSync(output, { recursive: true, force: true })
    }
  })
})
