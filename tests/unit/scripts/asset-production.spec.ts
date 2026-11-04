import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, expect, it } from 'vitest'

const roots: string[] = []
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })))
it.skipIf(process.platform === 'win32')(
  'creates an immutable mirror once and restores configuration on validation failure',
  async () => {
    const { productionProgram } = await import(path.resolve('scripts/asset-production.mjs'))
    const root = mkdtempSync(path.join(tmpdir(), 'juya-mirror-'))
    roots.push(root)
    const base = path.join(root, 'static'),
      config = path.join(root, 'nginx.conf')
    mkdirSync(base)
    const original = 'server {\n    server_name api.juyayingyu.com;\n}\n'
    writeFileSync(config, original)
    for (const file of ['nginx', 'systemctl'])
      writeFileSync(path.join(root, file), '#!/bin/sh\nexit 0\n', { mode: 0o755 })
    const program = productionProgram()
      .replace('/opt/juya/rebuild/production/miniapp-static', base)
      .replace('/etc/nginx/conf.d/juya-rebuild-production.conf', config)
      .replace('/run/lock/juya-miniapp-assets.lock', path.join(root, 'lock'))
    const body = Buffer.from('immutable-image'),
      sha = createHash('sha256').update(body).digest('hex')
    const file = `images/art-${sha.slice(0, 12)}.jpg`
    const input = JSON.stringify([
      { file, data: body.toString('base64'), sha256: sha, contentType: 'image/jpeg' }
    ])
    const options = {
      input,
      env: { ...process.env, PATH: root + path.delimiter + process.env.PATH }
    }
    expect(
      JSON.parse(execFileSync('python3', ['-c', program], options).toString()).new_routes
    ).toBe(1)
    expect(readFileSync(path.join(base, file))).toEqual(body)
    expect(
      JSON.parse(execFileSync('python3', ['-c', program], options).toString()).new_routes
    ).toBe(0)
    writeFileSync(config, original)
    writeFileSync(path.join(root, 'nginx'), '#!/bin/sh\nexit 1\n', { mode: 0o755 })
    expect(spawnSync('python3', ['-c', program], options).status).not.toBe(0)
    expect(readFileSync(config, 'utf8')).toBe(original)
  }
)

it('rejects missing SSH trust and unreadable private keys before connecting', async () => {
  const { mirrorProductionAssets } = await import(path.resolve('scripts/asset-production.mjs'))
  await expect(
    mirrorProductionAssets({ assets: [], config: { host: 'unused', username: 'fixture' } })
  ).rejects.toThrow(/指纹/)
  await expect(
    mirrorProductionAssets({
      assets: [],
      config: {
        host: 'unused',
        username: 'fixture',
        hostKeys: ['a'.repeat(64)],
        privateKeyFile: '/nonexistent/juya-key'
      }
    })
  ).rejects.toThrow(/私钥/)
})
