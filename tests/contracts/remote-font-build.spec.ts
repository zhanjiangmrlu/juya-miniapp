import { spawnSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'

import { afterAll, expect, it } from 'vitest'

const root = fileURLToPath(new URL('../../', import.meta.url))
const output = mkdtempSync(path.join(tmpdir(), 'juya-font-build-'))
const require = createRequire(import.meta.url)
const cli = path.join(
  path.dirname(require.resolve('@dcloudio/vite-plugin-uni/package.json')),
  'bin/uni.js'
)

afterAll(() => rmSync(output, { recursive: true, force: true }))

it.each([
  ['test', true],
  ['production', true],
  ['production', false]
] as const)(
  'keeps fonts remote and isolates analytics in %s builds with enabled=%s',
  (mode, enabled) => {
    const directory = path.join(output, `${mode}-${enabled}`)
    // Vitest 自身处于 test 模式，不把它的 VITE 配置覆盖到待验证的生产构建
    const buildEnv = Object.fromEntries(
      Object.entries(process.env).filter(([key]) => !key.startsWith('VITE_'))
    )
    const result = spawnSync(process.execPath, [cli, 'build', '-p', 'mp-weixin', '--mode', mode], {
      cwd: root,
      env: {
        ...buildEnv,
        VITE_UMENG_ENABLED: String(enabled),
        VITE_UMENG_TEST_APP_KEY: 'fixture-umeng-test',
        VITE_UMENG_PROD_APP_KEY: 'fixture-umeng-prod',
        UNI_OUTPUT_DIR: directory
      },
      encoding: 'utf8'
    })
    expect(result.status, result.stdout + result.stderr).toBe(0)
    const css = readFileSync(path.join(directory, 'app.wxss'), 'utf8')
    const embedded = [...css.matchAll(/data:font\/woff;base64,([^'"\s)]+)/g)]
    expect(embedded).toHaveLength(0)
    const files = readdirSync(directory, { recursive: true }).map(String)
    expect(files.some((file) => file.endsWith('.woff'))).toBe(false)
    expect(files.some((file) => file.includes('home-watercolor'))).toBe(false)
    const javascript = files
      .filter((file) => file.endsWith('.js'))
      .map((file) => readFileSync(path.join(directory, file), 'utf8'))
      .join('\n')
    expect(javascript.includes('um_uuid')).toBe(enabled)
    expect(javascript.includes('fixture-umeng-test')).toBe(enabled && mode === 'test')
    expect(javascript.includes('fixture-umeng-prod')).toBe(enabled && mode === 'production')
    expect(javascript.includes('content_view')).toBe(false)
    for (const event of [
      'entry_click',
      'business_error',
      'dictionary_success',
      'study_note_ready',
      'contact_save'
    ])
      expect(javascript.includes(event)).toBe(enabled)
    const audioController = readFileSync(
      path.join(directory, 'services/audio-controller.js'),
      'utf8'
    )
    expect(audioController.includes('audio_kind')).toBe(enabled)
    const policy = readFileSync(
      path.join(directory, 'components/app-privacy-sheet/app-privacy-sheet.wxml'),
      'utf8'
    )
    expect(policy.includes('使用统计')).toBe(enabled)
    expect(policy.includes('<switch')).toBe(false)
    if (!enabled) {
      const compiled: {
        analytics?: { available: boolean; choice: () => unknown; hasConsent: () => boolean }
      } = {}
      runInNewContext(readFileSync(path.join(directory, 'services/analytics.js'), 'utf8'), {
        exports: compiled
      })
      expect(compiled.analytics?.available).toBe(false)
      expect(compiled.analytics?.choice()).toBeUndefined()
      expect(compiled.analytics?.hasConsent()).toBe(false)
    }
    const { measureMainPackage } = require(path.join(root, 'scripts/verify-mp-package-budget.mjs'))
    expect(measureMainPackage(directory).sourceBytes).toBeLessThan((enabled ? 512 : 450) * 1024)
  },
  60000
)
