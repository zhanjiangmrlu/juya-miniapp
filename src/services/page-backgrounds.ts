import { STATIC_ASSET_BASE_URL } from '@/shared/constants/brand'
import { PAGE_BACKGROUND_ORIGINALS, PAGE_BACKGROUNDS } from '@/shared/constants/ui'

import type { PageBackgroundKind } from '@/shared/enums/ui'
/** 组合外置背景地址，不把大图加入微信主包
 * @param kind 页面背景类别
 * @param original 压缩背景失败时改用交付 PNG 原图
 * @returns 静态资源地址
 */
export const pageBackgroundURL = (kind: PageBackgroundKind, original = false) =>
  `${STATIC_ASSET_BASE_URL || '/design-assets'}/backgrounds/${(original ? PAGE_BACKGROUND_ORIGINALS : PAGE_BACKGROUNDS)[kind]}`
