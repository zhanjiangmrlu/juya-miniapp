import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { runInNewContext } from 'node:vm'

import { expect, it } from 'vitest'

/** 加载真实编译CommonJS模块，directory 为已构建的微信包 */
const runtime = (directory: string) => {
  const modules = new Map<string, { exports: Record<string, unknown> }>()
  /** 解析本包内依赖，filename 为编译模块路径 */
  const load = (filename: string): Record<string, unknown> => {
    if (modules.has(filename)) return modules.get(filename)!.exports
    const module = { exports: {} as Record<string, unknown> }
    modules.set(filename, module)
    runInNewContext(
      readFileSync(filename, 'utf8'),
      {
        exports: module.exports,
        require: (specifier: string) => load(path.resolve(path.dirname(filename), specifier))
      },
      { filename }
    )
    return module.exports
  }
  return { load: (file: string) => load(path.join(directory, file)) }
}
it('locks each real WeChat build to its own image URL and refreshes share cache metadata after a same-name replacement', () => {
  const root = process.cwd(),
    fixture = mkdtempSync(path.join(tmpdir(), 'juya-version-build-'))
  try {
    for (const directory of ['src', 'resources', 'scripts', 'build'])
      cpSync(path.join(root, directory), path.join(fixture, directory), { recursive: true })
    for (const file of ['vite.config.ts', 'tsconfig.json', 'package.json', '.env.test'])
      copyFileSync(path.join(root, file), path.join(fixture, file))
    symlinkSync(path.join(root, 'node_modules'), path.join(fixture, 'node_modules'), 'dir')
    mkdirSync(path.join(fixture, 'resources/oss/images'))
    const logical = path.join(fixture, 'resources/oss/images/name.svg')
    writeFileSync(logical, '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>')
    const require = createRequire(import.meta.url)
    const cli = path.join(
      path.dirname(require.resolve('@dcloudio/vite-plugin-uni/package.json')),
      'bin/uni.js'
    )
    const urls: string[] = []
    const publicEnv = Object.fromEntries(
      Object.entries(process.env).filter(
        ([key]) => !key.startsWith('VITE_') && !key.startsWith('UNI_')
      )
    )
    for (const version of [1, 2]) {
      if (version === 2) {
        writeFileSync(
          logical,
          '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10"></svg>'
        )
        copyFileSync(
          path.join(fixture, 'resources/oss/brand/page-share-timeline-696f2baaa802.jpg'),
          path.join(fixture, 'resources/oss/brand/page-share-friends.jpg')
        )
      }
      const output = path.join(fixture, `output-${version}`)
      const result = spawnSync(
        process.execPath,
        [cli, 'build', '-p', 'mp-weixin', '--mode', 'test'],
        {
          cwd: fixture,
          env: {
            ...publicEnv,
            NODE_ENV: 'production',
            UNI_OUTPUT_DIR: output,
            JUYA_ASSET_BUILD_MANIFEST: path.join(fixture, `build-map-${version}.json`)
          },
          encoding: 'utf8'
        }
      )
      expect(result.status, result.stdout + result.stderr).toBe(0)
      const compiled = runtime(output)
      const resolver = compiled.load('services/asset-url.js')
      const url = (resolver.assetUrl as (key: string) => string)('images/name.svg')
      expect(url).toMatch(
        /^https:\/\/juya-test\.oss-cn-shenzhen\.aliyuncs\.com\/miniapp\/static\/images\/name-[a-f0-9]{12}\.svg$/
      )
      urls.push(url)
      const info = (resolver.assetInfo as (key: string) => { width: number })('images/name.svg')
      expect(info.width).toBe(version === 1 ? 10 : 20)
      const covers = compiled.load('shared/constants/share.js').PAGE_SHARE_COVERS as {
        friends: { file: string; width: number; height: number; bytes: number; url: string }
      }
      expect(covers.friends.file).toBe(
        version === 1
          ? 'page-share-friends-2f9a6c3d5888.jpg'
          : 'page-share-friends-696f2baaa802.jpg'
      )
      expect(covers.friends.width).toBe(version === 1 ? 1402 : 1254)
      expect(covers.friends.height).toBe(version === 1 ? 1122 : 1254)
      expect(covers.friends.bytes).toBe(version === 1 ? 114076 : 130645)
      expect(covers.friends.url).toContain(covers.friends.file)
    }
    expect(urls[1]).not.toBe(urls[0])
    const old = runtime(path.join(fixture, 'output-1')).load('services/asset-url.js')
    expect((old.assetUrl as (key: string) => string)('images/name.svg')).toBe(urls[0])
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
}, 120000)
