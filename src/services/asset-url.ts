import { ASSET_MANIFEST, STATIC_ASSET_BASE_URL } from '@/shared/constants/assets'

/** 返回本次打包锁定的公开资源信息，logicalFile 为项目中固定的相对路径 */
export const assetInfo = (logicalFile: string) =>
  Object.prototype.hasOwnProperty.call(ASSET_MANIFEST, logicalFile)
    ? ASSET_MANIFEST[logicalFile]
    : undefined
/** 将固定逻辑名解析为当前包的版本地址，logicalFile 为资源相对路径，base 可覆盖访问根地址 */
export const assetUrl = (logicalFile: string, base = STATIC_ASSET_BASE_URL || '/design-assets') => {
  const info = assetInfo(logicalFile)
  return info ? `${base.replace(/\/+$/, '')}/${info.file}` : ''
}
