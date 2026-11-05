import { spawnSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterAll, expect, it } from 'vitest'

const root = fileURLToPath(new URL('../../', import.meta.url))
const output = mkdtempSync(path.join(tmpdir(), 'juya-font-build-'))
const require = createRequire(import.meta.url)
const cli = path.join(
  path.dirname(require.resolve('@dcloudio/vite-plugin-uni/package.json')),
  'bin/uni.js'
)

afterAll(() => rmSync(output, { recursive: true, force: true }))

it.each(['test', 'production'])(
  'keeps fonts remote and the optimized main package small in %s builds',
  (mode) => {
    const directory = path.join(output, mode)
    // Vitest 自身处于 test 模式，不把它的 VITE 配置覆盖到待验证的生产构建
    const buildEnv = Object.fromEntries(
      Object.entries(process.env).filter(([key]) => !key.startsWith('VITE_'))
    )
    const result = spawnSync(process.execPath, [cli, 'build', '-p', 'mp-weixin', '--mode', mode], {
      cwd: root,
      env: { ...buildEnv, UNI_OUTPUT_DIR: directory },
      encoding: 'utf8'
    })
    expect(result.status, result.stdout + result.stderr).toBe(0)
    const css = readFileSync(path.join(directory, 'app.wxss'), 'utf8')
    const embedded = [...css.matchAll(/data:font\/woff;base64,([^'"\s)]+)/g)]
    expect(embedded).toHaveLength(0)
    const files = readdirSync(directory, { recursive: true }).map(String)
    expect(files.some((file) => file.endsWith('.woff'))).toBe(false)
    expect(files.some((file) => file.includes('home-watercolor'))).toBe(false)
    const { measureMainPackage } = require(path.join(root, 'scripts/verify-mp-package-budget.mjs'))
    expect(measureMainPackage(directory).sourceBytes).toBeLessThan(450 * 1024)
  },
  60000
)
