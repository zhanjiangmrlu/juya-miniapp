import assert from 'node:assert/strict'
import { lstatSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/** 测量实际未压缩主包，预留20%微信转换膨胀及额外100KB，不以ZIP替代平台限制
 * @param root 微信编译产物根目录
 */
export const measureMainPackage = (root) => {
  const configuration = JSON.parse(readFileSync(path.join(root, 'app.json'), 'utf8'))
  const subpackages = (configuration.subPackages || []).map((item) => `${item.root}/`)
  const files = []
  /** 累加未位于分包目录内的实际文件，不接受符号链接绕过主包计量
   * @param directory 当前待遍历的产物目录
   */
  const visit = (directory) => {
    for (const name of readdirSync(directory)) {
      const absolute = path.join(directory, name),
        relative = path.relative(root, absolute).split(path.sep).join('/'),
        stat = lstatSync(absolute)
      assert.ok(!stat.isSymbolicLink(), `Unexpected artifact symlink: ${relative}`)
      if (subpackages.some((prefix) => `${relative}/`.startsWith(prefix))) continue
      if (stat.isDirectory()) visit(absolute)
      else if (stat.isFile()) files.push({ path: relative, bytes: stat.size })
    }
  }
  visit(root)
  const sourceBytes = files.reduce((total, file) => total + file.bytes, 0),
    limitBytes = 2 * 1024 * 1024,
    reserveBytes = 100 * 1024,
    estimatedBytes = Math.ceil(sourceBytes * 1.2)
  return {
    sourceBytes,
    estimatedBytes,
    reserveBytes,
    limitBytes,
    remainingBytes: limitBytes - estimatedBytes,
    files
  }
}

/** 阻止接近微信主包上限的发布构建，错误中给出未压缩体积及保留余量
 * @param root 微信编译产物根目录
 */
export const verifyMainPackage = (root) => {
  const report = measureMainPackage(root)
  assert.ok(
    !report.files.some((file) => file.path === 'static/brand/u00-botanical-watercolor@3x.png'),
    'OSS login artwork must stay outside the Mini Program package'
  )
  assert.ok(
    report.remainingBytes >= report.reserveBytes,
    `Main package budget exceeded: source=${report.sourceBytes}B, with20percentConversion=${report.estimatedBytes}B, remaining=${report.remainingBytes}B, requiredReserve=${report.reserveBytes}B, platformLimit=${report.limitBytes}B`
  )
  return report
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const root = process.env.UNI_OUTPUT_DIR
    ? path.resolve(process.env.UNI_OUTPUT_DIR)
    : fileURLToPath(new URL('../dist/build/mp-weixin/', import.meta.url))
  const report = verifyMainPackage(root)
  console.info(
    `Verified main package budget: source ${report.sourceBytes}B, with20percentConversion ${report.estimatedBytes}B, remaining ${report.remainingBytes}B (required reserve ${report.reserveBytes}B)`
  )
}
