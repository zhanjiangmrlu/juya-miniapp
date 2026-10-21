/** 按展示用途选择素材编号，默认只用缩略图，缺失时不提前下载原图
 * @param thumbnailId 当前展示版本已有的缩略图编号
 * @param originalId 当前展示版本的原图编号
 * @param original 用户明确查看大图时才选择原图
 */
export const sceneImageId = (
  thumbnailId?: string | null,
  originalId?: string | null,
  original = false
): string => (original ? originalId : thumbnailId) || ''

/** 在已签发的资源链接上追加列表/详情小图规格，原图查看不调用此方法
 * @param url 当前账号与发布版本已授权的缩略图地址
 */
export const sceneThumbnailURL = (url: string): string => {
  if (!url) return ''
  const fragmentAt = url.indexOf('#'),
    address = fragmentAt < 0 ? url : url.slice(0, fragmentAt),
    fragment = fragmentAt < 0 ? '' : url.slice(fragmentAt)
  return `${address}${address.includes('?') ? '&' : '?'}thumbnail=list${fragment}`
}
