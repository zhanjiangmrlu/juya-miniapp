import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, expect, it, vi } from 'vitest'

const roots: string[] = []
afterEach(() => {
  vi.unstubAllEnvs()
  roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true }))
})

it.skipIf(process.platform === 'win32')(
  'passes the calculated version to the uploader and requires a fresh JSON receipt',
  async () => {
    const script = path.resolve('scripts/wechat-release-build.mjs')
    const { uploadWeChat } = await import(script)
    const root = mkdtempSync(path.join(tmpdir(), 'juya uploader '))
    roots.push(root)
    mkdirSync(path.join(root, 'dist/release'), { recursive: true })
    const cli = path.join(root, 'fake-cli.mjs')
    const log = path.join(root, 'args.json')
    writeFileSync(
      cli,
      `#!${process.execPath}\nimport fs from 'node:fs'; const args=process.argv.slice(2); fs.writeFileSync(${JSON.stringify(log)}, JSON.stringify(args)); fs.writeFileSync(args[args.indexOf('--info-output')+1], '{"size":123}');\n`,
      { mode: 0o755 }
    )
    vi.stubEnv('WECHAT_DEVTOOLS_CLI', cli)
    const options = {
      root,
      candidate: { version: '1.0.1', versionCode: 101 },
      output: path.join(root, 'dist/release/mp-weixin')
    }
    expect(uploadWeChat(options)).toEqual({ status: 'success', info: { size: 123 } })
    const args = JSON.parse(readFileSync(log, 'utf8'))
    expect(args.slice(0, 5)).toEqual(['upload', '--project', options.output, '--version', '1.0.1'])
    // 第二次进程没有回执，即使留下第一次的文件也不能误判为成功
    writeFileSync(cli, `#!${process.execPath}\nprocess.exit(0)\n`, { mode: 0o755 })
    expect(uploadWeChat(options).status).toBe('unknown')
    vi.stubEnv('WECHAT_DEVTOOLS_CLI', path.join(root, 'missing-cli'))
    expect(uploadWeChat(options).status).toBe('failed')
  }
)
