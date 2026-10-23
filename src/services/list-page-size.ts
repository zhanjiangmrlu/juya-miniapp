/** 由视口和现有列表行高估算本轮页长，缺少设备能力时采用常见手机尺寸
 * @param rowRpx 当前列表单行占用的设计高度
 * @param reservedRpx 导航、统计、标题和底栏占用的设计高度
 */
export const listPageSize = (rowRpx = 268.577, reservedRpx = 400): number => {
  const info =
    typeof uni === 'undefined'
      ? undefined
      : typeof uni.getWindowInfo === 'function'
        ? uni.getWindowInfo()
        : uni.getSystemInfoSync?.()
  const width = info?.windowWidth && info.windowWidth > 0 ? info.windowWidth : 375,
    height = info?.windowHeight && info.windowHeight > 0 ? info.windowHeight : 667,
    scale = width / 750
  return Math.max(1, Math.min(50, Math.floor((height / scale - reservedRpx) / rowRpx)))
}
