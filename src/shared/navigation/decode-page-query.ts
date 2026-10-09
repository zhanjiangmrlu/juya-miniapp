/** 读取页面路由值，value 为 onLoad 参数；微信端解码一次，H5 已由框架解码 */
export const decodePageQuery = (value?: string): string => {
  let decoded = value ?? ''
  // #ifdef MP-WEIXIN
  try {
    decoded = decodeURIComponent(decoded)
  } catch {
    return decoded
  }
  // #endif
  return decoded
}
