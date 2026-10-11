import { decodePageQuery } from '@/shared/navigation/decode-page-query'

import type { ShortReadingEntryOptions } from '@/shared/types/short-reading'

/** 读取收藏来源的版本和精确段落，query 为uni-app页面参数；非法版本仍保留来源标记 */
export const shortReadingEntryFromQuery = (
  query?: Record<string, string>
): ShortReadingEntryOptions => {
  const version = query?.contentVersion
  const locator = query?.sourceLocator
  return {
    ...(version === undefined ? {} : { contentVersion: Number(decodePageQuery(version)) }),
    ...(locator === undefined ? {} : { sourceLocator: decodePageQuery(locator) })
  }
}
