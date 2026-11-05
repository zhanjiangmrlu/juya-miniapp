import { createHash } from 'node:crypto'
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { imageSize } from 'image-size'

const mimeTypes = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.woff': 'font/woff'
}
/** 将逻辑文件名转换为内容版本名，source 为相对路径，sha256 为当前字节哈希 */
const versionedFile = (source, sha256) => {
  const extension = path.posix.extname(source)
  let stem = source.slice(0, -extension.length)
  const scale = stem.endsWith('@3x') ? '@3x' : ''
  if (scale) stem = stem.slice(0, -scale.length)
  stem = stem.replace(/-[a-f0-9]{12}$/, '')
  return `${stem}-${sha256.slice(0, 12)}${scale}${extension}`
}
/** 扫描资源并生成公开版本映射，root 为小程序仓库 */
export const collectAssetCatalog = (root) => {
  const base = path.join(root, 'resources/oss')
  if (lstatSync(path.join(root, 'resources')).isSymbolicLink())
    throw new Error('资源不允许符号链接')
  const archivePath = path.join(base, 'publish-archive.json')
  if (existsSync(archivePath) && lstatSync(archivePath).isSymbolicLink())
    throw new Error('资源不允许符号链接')
  let archive = {}
  try {
    if (existsSync(archivePath)) archive = JSON.parse(readFileSync(archivePath, 'utf8'))
  } catch {
    throw new Error('资源归档清单格式错误')
  }
  const assets = [],
    map = {},
    sources = {},
    remote = new Map()
  /** 校验资源树，directory 为待扫描目录 */
  const visit = (directory) => {
    if (lstatSync(directory).isSymbolicLink()) throw new Error('资源不允许符号链接')
    for (const name of readdirSync(directory).sort()) {
      const absolute = path.join(directory, name),
        stat = lstatSync(absolute)
      if (stat.isSymbolicLink()) throw new Error('资源不允许符号链接')
      if (stat.isDirectory()) {
        visit(absolute)
        continue
      }
      if (!stat.isFile()) throw new Error('资源必须为普通文件')
      const source = path.relative(base, absolute).split(path.sep).join('/'),
        extension = path.extname(source)
      if (['.json', '.md'].includes(extension) || ['.DS_Store', 'Thumbs.db'].includes(name))
        continue
      if (!mimeTypes[extension] || !/^[a-z0-9@._/-]+$/.test(source))
        throw new Error(`资源文件名或类型无效：${source}`)
      const body = readFileSync(absolute),
        sha256 = createHash('sha256').update(body).digest('hex')
      if (body.length > 16 * 1024 * 1024) throw new Error(`资源超过16MiB：${source}`)
      const legacy = Object.hasOwn(archive, source)
      if (legacy && archive[source] !== sha256)
        throw new Error(`历史原图已改变，请建立新的逻辑文件：${source}`)
      let dimensions = {}
      if (extension !== '.woff') {
        try {
          const info = imageSize(body)
          if (!info.width || !info.height) throw new Error('missing dimensions')
          dimensions = { width: info.width, height: info.height }
        } catch {
          throw new Error(`无法读取图片尺寸：${source}`)
        }
      }
      const file = legacy ? source : versionedFile(source, sha256)
      sources[source] = sha256
      map[source] = { file, bytes: body.length, ...dimensions, ...(legacy ? { legacy: true } : {}) }
      if (legacy) continue
      if (remote.has(file)) {
        if (remote.get(file) !== sha256) throw new Error(`资源版本名冲突：${source}`)
        continue
      }
      remote.set(file, sha256)
      assets.push({
        source,
        file,
        key: `miniapp/static/${file}`,
        sha256,
        bytes: body.length,
        body,
        ...dimensions,
        contentType: mimeTypes[extension],
        cacheControl: 'public, max-age=31536000, immutable'
      })
    }
  }
  visit(base)
  return { assets, map, sources }
}
/** 将本次编译的资源清单写到包外，root 为仓库，file 为独立构建元数据路径，catalog 为可选的同次扫描结果 */
export const writeBuildManifest = (root, file, catalog = collectAssetCatalog(root)) => {
  const { map, sources } = catalog
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify({ version: 1, map, sources }, null, 2) + '\n')
  return map
}
/** 发布前确认资源与编译清单一致，catalog 为当前资源，file 为编译记录 */
export const assertBuildManifest = (catalog, file) => {
  let expected
  try {
    expected = JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    throw new Error('缺少有效的构建资源清单')
  }
  if (
    expected.version !== 1 ||
    JSON.stringify(expected.sources) !== JSON.stringify(catalog.sources) ||
    JSON.stringify(expected.map) !== JSON.stringify(catalog.map)
  )
    throw new Error('构建后资源已改变，请重新打包')
}
