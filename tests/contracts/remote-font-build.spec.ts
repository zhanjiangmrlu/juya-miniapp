import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
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
  'ships remote fonts only in the test rollout, preserving the original production font data (%s)',
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
    if (mode === 'test') {
      expect(embedded).toHaveLength(0)
      expect(
        readdirSync(directory, { recursive: true }).some((file) => String(file).endsWith('.woff'))
      ).toBe(false)
    } else {
      expect(
        embedded.map((match) =>
          createHash('sha256').update(Buffer.from(match[1], 'base64')).digest('hex')
        )
      ).toEqual([
        '19b2ba846548029c4fe0bb423de90d84a90473aae241db54296638b35720fc0a',
        '1a07e715bff9af0269c13d8cd49226c50c8c649d39ba6f3477d0b0d2136e9000',
        '0e42d420e3d2e1f55aac75f2ffb3d4b4732b4637c80422959d9982a4c9edda2f',
        '2de0b76bda1d0a672e6eea56ab31daf06a08b67db6bd076d5501d3b7cf4115ed'
      ])
    }
  },
  60000
)
