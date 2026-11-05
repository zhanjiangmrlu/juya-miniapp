import { readFileSync } from 'node:fs'
import path from 'node:path'

import { expect, it, vi } from 'vitest'

it('builds an isolated production candidate without changing source manifest or successful record', async () => {
  const root = process.cwd()
  const script = path.join(root, 'scripts/wechat-release-build.mjs')
  const { buildProduction } = await import(script)
  const manifest = readFileSync('src/manifest.json', 'utf8')
  const record = readFileSync('release/wechat-version.json', 'utf8')
  vi.stubEnv('VITE_API_BASE_URL', 'https://test-api.juyayingyu.com')
  vi.stubEnv('VITE_USE_MOCK_API', 'true')
  vi.stubEnv('VITE_LOCAL_DEV_MODE', 'true')
  vi.stubEnv('VITE_REMOTE_FONTS', 'false')
  try {
    const output = buildProduction({ root, candidate: { version: '1.0.1', versionCode: 101 } })
    const input = JSON.parse(readFileSync('dist/release/input/manifest.json', 'utf8'))
    const css = readFileSync(path.join(output, 'app.wxss'), 'utf8')
    expect(css).not.toContain('data:font/woff;base64,')
    const { measureMainPackage } = await import(
      path.join(root, 'scripts/verify-mp-package-budget.mjs')
    )
    expect(measureMainPackage(output).sourceBytes).toBeLessThan(450 * 1024)
    expect(input.versionName).toBe('1.0.1')
    expect(input.versionCode).toBe('101')
    expect(output).toBe(path.join(root, 'dist/release/mp-weixin'))
    const runtime = readFileSync(path.join(output, 'services/platform.js'), 'utf8')
    expect(runtime).toContain('https://api.juyayingyu.com')
    expect(runtime).not.toContain('test-api.juyayingyu.com')
    expect(readFileSync('src/manifest.json', 'utf8')).toBe(manifest)
    expect(readFileSync('release/wechat-version.json', 'utf8')).toBe(record)
  } finally {
    vi.unstubAllEnvs()
  }
}, 60000)
