import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, expect, it, vi } from 'vitest'

const roots: string[] = []
/** 建立测试发布仓库，版本与输出均由发布入口生成 */
const fixture = () => {
  const root = mkdtempSync(path.join(tmpdir(), 'juya-test-release-'))
  roots.push(root)
  writeFileSync(path.join(root, 'package.json'), JSON.stringify({ version: '1.5.0' }))
  return root
}
afterEach(() => {
  vi.unstubAllEnvs()
  roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true }))
})
it('builds and publishes test resources before uploading only the isolated test package', async () => {
  const { runTestRelease } = await import(path.resolve('scripts/release-mp-weixin-test.mjs'))
  const root = fixture(),
    events: string[] = []
  await runTestRelease({
    root,
    now: new Date('2026-11-04T10:00:00Z'),
    build: ({ output, candidate }: { output: string; candidate: { version: string } }) => {
      events.push('build-and-publish-test-assets')
      expect(output.startsWith(path.join(root, 'dist/test-release/'))).toBe(true)
      expect(candidate.version).toBe('1.5.0-test.20261104.180000')
      mkdirSync(output, { recursive: true })
      writeFileSync(path.join(output, 'marker'), 'built package')
    },
    upload: ({
      output,
      directory,
      description
    }: {
      output: string
      directory: string
      description: string
    }) => {
      expect(readFileSync(path.join(output, 'marker'), 'utf8')).toBe('built package')
      expect(directory).toBe(path.dirname(output))
      expect(description).toBe('测试环境 1.5.0-test.20261104.180000')
      events.push('upload')
      return { status: 'success', info: { size: 123 } }
    }
  })
  expect(events).toEqual(['build-and-publish-test-assets', 'upload'])
  expect(readFileSync(path.join(root, 'package.json'), 'utf8')).toBe('{"version":"1.5.0"}')
})
it('does not upload if the test build or OSS publication fails', async () => {
  const { runTestRelease } = await import(path.resolve('scripts/release-mp-weixin-test.mjs'))
  let uploaded = false
  await expect(
    runTestRelease({
      root: fixture(),
      build: () => {
        throw new Error('asset publication failed')
      },
      upload: () => {
        uploaded = true
      }
    })
  ).rejects.toThrow('asset publication failed')
  expect(uploaded).toBe(false)
})
it.each(['failed', 'unknown'])('stops on %s upload without retrying', async (status) => {
  const { runTestRelease } = await import(path.resolve('scripts/release-mp-weixin-test.mjs'))
  let uploads = 0
  await expect(
    runTestRelease({
      root: fixture(),
      build: () => {},
      upload: () => {
        uploads++
        return { status, info: 'inspect receipt' }
      }
    })
  ).rejects.toThrow(status === 'unknown' ? /结果不明确/ : /上传失败/)
  expect(uploads).toBe(1)
})
it.skipIf(process.platform === 'win32')(
  'uses official upload CLI with test description and an isolated receipt',
  async () => {
    const { uploadWeChat } = await import(path.resolve('scripts/wechat-release-build.mjs'))
    const root = fixture(),
      directory = path.join(root, 'dist/test-release/fixture')
    mkdirSync(directory, { recursive: true })
    const cli = path.join(root, 'fake-cli.mjs'),
      argsFile = path.join(root, 'args.json')
    writeFileSync(
      cli,
      `#!${process.execPath}\nimport fs from 'node:fs'; const args=process.argv.slice(2); fs.writeFileSync(${JSON.stringify(argsFile)},JSON.stringify(args));fs.writeFileSync(args[args.indexOf('--info-output')+1], '{"size":321}');\n`,
      { mode: 0o755 }
    )
    vi.stubEnv('WECHAT_DEVTOOLS_CLI', cli)
    const result = uploadWeChat({
      root,
      directory,
      output: path.join(directory, 'mp-weixin'),
      candidate: { version: '1.5.0-test.20261104.180000' },
      description: '测试环境 1.5.0-test.20261104.180000'
    })
    expect(result).toEqual({ status: 'success', info: { size: 321 } })
    const args = JSON.parse(readFileSync(argsFile, 'utf8'))
    expect(args[args.indexOf('--desc') + 1]).toBe('测试环境 1.5.0-test.20261104.180000')
    expect(args[args.indexOf('--info-output') + 1]).toBe(path.join(directory, 'upload-info.json'))
    expect(args[0]).toBe('upload')
  }
)
