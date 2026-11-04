import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, expect, it } from 'vitest'

const script = path.resolve('scripts/release-mp-weixin.mjs')
const roots: string[] = []
/** 创建带本地远程仓库的隔离发布夹具，branch 指定测试分支 */
const fixture = (branch = 'release') => {
  const base = mkdtempSync(path.join(tmpdir(), 'juya-release-'))
  roots.push(base)
  const root = path.join(base, 'repo')
  mkdirSync(root)
  /** 在夹具执行 Git，args 为独立参数列表 */
  const git = (...args: string[]) =>
    execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    }).trim()
  git('init', '-b', branch)
  git('config', 'user.email', 'fixture@example.invalid')
  git('config', 'user.name', 'Fixture')
  mkdirSync(path.join(root, 'release'))
  mkdirSync(path.join(root, 'src'))
  writeFileSync(path.join(root, '.gitignore'), 'dist/\n')
  writeFileSync(
    path.join(root, 'release/wechat-version.json'),
    JSON.stringify({ version: '1.0.0', versionCode: 100, sourceCommit: 'a'.repeat(40) })
  )
  writeFileSync(
    path.join(root, 'src/manifest.json'),
    JSON.stringify({ versionName: '1.5.0', versionCode: '150', 'mp-weixin': { appid: 'fixture' } })
  )
  git('add', '.')
  git('commit', '-m', 'fixture')
  const remote = path.join(base, 'remote.git')
  execFileSync('git', ['init', '--bare', remote], { stdio: 'ignore' })
  git('remote', 'add', 'origin', remote)
  git('push', '-u', 'origin', branch)
  /** 读取夹具成功版本记录 */
  const record = () =>
    JSON.parse(readFileSync(path.join(root, 'release/wechat-version.json'), 'utf8'))
  return { root, git, record }
}
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })))

it('increments the patch as a number and rejects malformed records', async () => {
  const { nextVersion } = await import(script)
  expect(nextVersion({ version: '1.0.9', versionCode: 109, sourceCommit: 'a'.repeat(40) })).toEqual(
    { version: '1.0.10', versionCode: 110 }
  )
  for (const version of ['1.0', '1.0.0-beta', '01.0.0', '1.0.-1'])
    expect(() => nextVersion({ version, versionCode: 100, sourceCommit: 'a'.repeat(40) })).toThrow()
})
it('uploads 1.0.1 then 1.0.2 without requiring publication and syncs only release records', async () => {
  const { runRelease } = await import(script)
  const f = fixture()
  const versions: string[] = []
  /** 模拟包检查，candidate 为本轮版本 */
  const build = ({ candidate }: { candidate: { version: string } }) => {
    versions.push(candidate.version)
  }
  const upload = () => ({ status: 'success', info: { fixture: true } })
  await runRelease({ root: f.root, build, upload })
  expect(f.record().version).toBe('1.0.1')
  await runRelease({ root: f.root, build, upload })
  expect(versions).toEqual(['1.0.1', '1.0.2'])
  expect(f.record().versionCode).toBe(102)
  expect(f.git('status', '--porcelain')).toBe('')
  expect(f.git('rev-parse', 'HEAD')).toBe(
    f.git('ls-remote', 'origin', 'refs/heads/release').split(/\s/)[0]
  )
  expect(JSON.parse(readFileSync(path.join(f.root, 'src/manifest.json'), 'utf8')).versionName).toBe(
    '1.0.2'
  )
})
it.each(['dry-run', 'build-only'])('%s does not upload or advance records', async (mode) => {
  const { runRelease } = await import(script)
  const f = fixture()
  const head = f.git('rev-parse', 'HEAD')
  await runRelease({
    root: f.root,
    mode,
    build: () => {},
    upload: () => {
      throw new Error('must not upload')
    }
  })
  expect(f.record().version).toBe('1.0.0')
  expect(f.git('rev-parse', 'HEAD')).toBe(head)
})
it('keeps the version after build failure or explicit upload rejection', async () => {
  const { runRelease } = await import(script)
  const f = fixture()
  await expect(
    runRelease({
      root: f.root,
      build: () => {
        throw new Error('build failed')
      }
    })
  ).rejects.toThrow('build failed')
  await expect(
    runRelease({ root: f.root, build: () => {}, upload: () => ({ status: 'failed' }) })
  ).rejects.toThrow()
  expect(f.record().version).toBe('1.0.0')
  await runRelease({ root: f.root, build: () => {}, upload: () => ({ status: 'success' }) })
  expect(f.record().version).toBe('1.0.1')
})
it('blocks unknown uploads until explicitly resolved and resumes without uploading again', async () => {
  const { runRelease } = await import(script)
  const f = fixture()
  await expect(
    runRelease({
      root: f.root,
      build: () => {},
      upload: () => {
        throw new Error('timeout')
      }
    })
  ).rejects.toThrow()
  await expect(runRelease({ root: f.root, mode: 'dry-run' })).rejects.toThrow(/待处理/)
  await runRelease({
    root: f.root,
    mode: 'confirm-uploaded',
    upload: () => {
      throw new Error('must not upload')
    }
  })
  expect(f.record().version).toBe('1.0.1')
})
it('resumes a successful upload after a rejected push without uploading again', async () => {
  const { runRelease } = await import(script)
  const f = fixture()
  const remote = f.git('remote', 'get-url', 'origin')
  f.git('config', 'remote.origin.pushurl', path.join(f.root, 'missing.git'))
  await expect(
    runRelease({ root: f.root, build: () => {}, upload: () => ({ status: 'success' }) })
  ).rejects.toThrow()
  expect(f.record().version).toBe('1.0.1')
  f.git('config', 'remote.origin.pushurl', remote)
  await runRelease({
    root: f.root,
    mode: 'resume',
    upload: () => {
      throw new Error('must not upload')
    }
  })
  expect(f.record().version).toBe('1.0.1')
  await expect(runRelease({ root: f.root, mode: 'resume' })).rejects.toThrow(/没有/)
})
it('rejects non-release, dirty, stale and locked repositories before building', async () => {
  const { runRelease } = await import(script)
  const other = fixture('test')
  await expect(runRelease({ root: other.root, mode: 'dry-run' })).rejects.toThrow(/release/)
  const f = fixture()
  writeFileSync(path.join(f.root, 'untracked.txt'), 'dirty')
  await expect(runRelease({ root: f.root, mode: 'dry-run' })).rejects.toThrow(/改动/)
  rmSync(path.join(f.root, 'untracked.txt'))
  mkdirSync(path.join(f.root, '.git/juya-wechat-release.lock'))
  await expect(runRelease({ root: f.root, mode: 'build-only' })).rejects.toThrow(/锁/)
  rmSync(path.join(f.root, '.git/juya-wechat-release.lock'), { recursive: true })
  f.git('commit', '--allow-empty', '-m', 'not synced')
  await expect(runRelease({ root: f.root, mode: 'dry-run' })).rejects.toThrow(/同步/)
})

it('recovers a crash between the version commit and journal update', async () => {
  const { runRelease } = await import(script)
  const f = fixture()
  f.git('config', 'remote.origin.pushurl', path.join(f.root, 'missing.git'))
  await expect(
    runRelease({ root: f.root, build: () => {}, upload: () => ({ status: 'success' }) })
  ).rejects.toThrow()
  const journalFile = path.join(f.root, '.git/juya-wechat-release.json')
  const journal = JSON.parse(readFileSync(journalFile, 'utf8'))
  journal.phase = 'succeeded'
  delete journal.recordCommit
  writeFileSync(journalFile, JSON.stringify(journal))
  f.git('config', '--unset', 'remote.origin.pushurl')
  await runRelease({ root: f.root, mode: 'resume' })
  expect(f.record().version).toBe('1.0.1')
})
it('does not commit unrelated manifest edits while recovering a failed commit', async () => {
  const { runRelease } = await import(script)
  const f = fixture()
  const hook = path.join(f.root, '.git/hooks/pre-commit')
  writeFileSync(hook, '#!/bin/sh\nexit 1\n', { mode: 0o755 })
  await expect(
    runRelease({ root: f.root, build: () => {}, upload: () => ({ status: 'success' }) })
  ).rejects.toThrow()
  rmSync(hook)
  const manifestFile = path.join(f.root, 'src/manifest.json')
  const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'))
  manifest.unrelated = 'should not be committed'
  writeFileSync(manifestFile, JSON.stringify(manifest))
  await expect(runRelease({ root: f.root, mode: 'resume' })).rejects.toThrow(/变化/)
})
it('allows retry of the same version after confirming an unknown upload did not succeed', async () => {
  const { runRelease } = await import(script)
  const f = fixture()
  await expect(
    runRelease({ root: f.root, build: () => {}, upload: () => ({ status: 'unknown' }) })
  ).rejects.toThrow()
  await runRelease({ root: f.root, mode: 'confirm-not-uploaded' })
  expect(f.record().version).toBe('1.0.0')
  await runRelease({ root: f.root, build: () => {}, upload: () => ({ status: 'success' }) })
  expect(f.record().version).toBe('1.0.1')
})
