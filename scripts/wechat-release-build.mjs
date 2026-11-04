import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

/** 运行发布子进程，command 为程序、args 为独立参数、options 为执行环境 */
const execute = (command, args, options) => {
  const result = spawnSync(command, args, { ...options, encoding: 'utf8' })
  if (result.error || result.status !== 0)
    throw new Error(
      `命令失败：${command}\n${result.error?.message || ''}\n${result.stdout || ''}\n${result.stderr || ''}`
    )
  return result
}

/** 构建独立生产包，root 为仓库目录、candidate 为本轮上传版本 */
export const buildProduction = ({ root, candidate }) => {
  const directory = path.join(root, 'dist/release')
  const input = path.join(directory, 'input')
  const output = path.join(directory, 'mp-weixin')
  rmSync(directory, { recursive: true, force: true })
  mkdirSync(directory, { recursive: true })
  cpSync(path.join(root, 'src'), input, { recursive: true })
  const manifestPath = path.join(input, 'manifest.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  manifest.versionName = candidate.version
  manifest.versionCode = String(candidate.versionCode)
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  // 不继承终端或 Vitest 注入的测试 API、Mock 及 uni 输入输出目录
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !/^(VITE_|UNI_)/i.test(key))
  )
  Object.assign(env, {
    NODE_ENV: 'production',
    UNI_INPUT_DIR: input,
    UNI_OUTPUT_DIR: output,
    VITE_API_BASE_URL: 'https://api.juyayingyu.com',
    VITE_STATIC_ASSET_BASE_URL: 'https://api.juyayingyu.com/miniapp/static',
    VITE_PAGE_SHARE_ASSET_BASE_URL: 'https://api.juyayingyu.com/miniapp/static',
    VITE_REMOTE_FONTS: 'false',
    VITE_USE_MOCK_API: 'false',
    VITE_LOCAL_DEV_MODE: 'false'
  })
  const require = createRequire(path.join(root, 'package.json'))
  const uni = path.join(
    path.dirname(require.resolve('@dcloudio/vite-plugin-uni/package.json')),
    'bin/uni.js'
  )
  for (const args of [
    [uni, 'build', '-p', 'mp-weixin', '--mode', 'production'],
    [path.join(root, 'scripts/verify-mp-page-meta.mjs')],
    [path.join(root, 'scripts/verify-mp-package-budget.mjs')]
  ]) {
    const result = execute(process.execPath, args, { cwd: root, env })
    console.info(result.stdout.trim())
  }
  const project = JSON.parse(readFileSync(path.join(output, 'project.config.json'), 'utf8'))
  if (
    project.appid !== manifest['mp-weixin'].appid ||
    existsSync(path.join(output, 'project.private.config.json'))
  )
    throw new Error('生产包 AppID 或私有配置检查失败')
  writeFileSync(
    path.join(directory, 'build-info.json'),
    JSON.stringify({ ...candidate, appid: project.appid, environment: 'production' }, null, 2) +
      '\n'
  )
  return output
}

/** 调用官方工具上传，root 为仓库目录、candidate 为版本、output 为已校验包路径 */
export const uploadWeChat = ({ root, candidate, output }) => {
  const cli =
    process.env.WECHAT_DEVTOOLS_CLI ||
    (process.platform === 'darwin' ? '/Applications/wechatwebdevtools.app/Contents/MacOS/cli' : '')
  if (!cli) return { status: 'failed', info: '请设置 WECHAT_DEVTOOLS_CLI 指向微信开发者工具 CLI' }
  const infoFile = path.join(root, 'dist/release/upload-info.json')
  rmSync(infoFile, { force: true })
  const args = [
    'upload',
    '--project',
    output,
    '--version',
    candidate.version,
    '--desc',
    `生产环境 ${candidate.version}`,
    '--info-output',
    infoFile
  ]
  const batch = process.platform === 'win32' && /\.(bat|cmd)$/i.test(cli)
  if (batch && [cli, ...args].some((value) => /["%!^&|<>\r\n]/.test(value)))
    return { status: 'failed', info: 'Windows CLI 路径含不支持的命令字符' }
  const result = spawnSync(
    batch ? process.env.ComSpec || 'cmd.exe' : cli,
    batch ? ['/d', '/s', '/c', `"${[cli, ...args].map((arg) => `"${arg}"`).join(' ')}"`] : args,
    { cwd: root, encoding: 'utf8', timeout: 300000 }
  )
  writeFileSync(
    path.join(root, 'dist/release/upload.log'),
    `${result.stdout || ''}\n${result.stderr || ''}`
  )
  if (result.error && ['ENOENT', 'EACCES'].includes(result.error.code))
    return { status: 'failed', info: result.error.message }
  if (result.status === 0 && existsSync(infoFile)) {
    try {
      return { status: 'success', info: JSON.parse(readFileSync(infoFile, 'utf8')) }
    } catch {
      /* 不完整回执必须人工核对 */
    }
  }
  // 非零退出也可能发生在远端已收包之后，不据此断言上传失败
  return { status: 'unknown', info: '请核对微信后台和 dist/release/upload.log' }
}
