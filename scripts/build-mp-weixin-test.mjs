import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { publishAssets } from './asset-publish.mjs'

/** 构建受控测试包，root 为仓库目录 */
const compileTest = (root) => {
  const require = createRequire(path.join(root, 'package.json'))
  const cli = path.join(
    path.dirname(require.resolve('@dcloudio/vite-plugin-uni/package.json')),
    'bin/uni.js'
  )
  const env = {
    ...process.env,
    VITE_API_BASE_URL: 'https://test-api.juyayingyu.com',
    VITE_STATIC_ASSET_BASE_URL: 'https://juya-test.oss-cn-shenzhen.aliyuncs.com/miniapp/static',
    VITE_PAGE_SHARE_ASSET_BASE_URL: 'https://juya-test.oss-cn-shenzhen.aliyuncs.com/miniapp/static',
    VITE_REMOTE_FONTS: 'true',
    VITE_USE_MOCK_API: 'false',
    VITE_LOCAL_DEV_MODE: 'false'
  }
  for (const args of [
    [cli, 'build', '-p', 'mp-weixin', '--mode', 'test'],
    [path.join(root, 'scripts/verify-mp-page-meta.mjs')],
    [path.join(root, 'scripts/verify-mp-package-budget.mjs')]
  ]) {
    const result = spawnSync(process.execPath, args, { cwd: root, env, stdio: 'inherit' })
    if (result.error || result.status !== 0) throw new Error('测试小程序构建或校验失败')
  }
}
/** 测试构建成功后同步测试资源，options 提供仓库及隔离测试用端口 */
export const buildTest = async ({ root, build = compileTest, publish = publishAssets }) => {
  await build(root)
  return publish({ root, environment: 'test' })
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    await buildTest({ root: process.cwd() })
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
