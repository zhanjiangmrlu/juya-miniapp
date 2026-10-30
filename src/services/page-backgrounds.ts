import { STATIC_ASSET_BASE_URL } from '@/shared/constants/brand'
import { PAGE_BACKGROUNDS } from '@/shared/constants/ui'

import type { PageBackgroundKind } from '@/shared/enums/ui'
/** 组合外置背景地址，不把大图加入微信主包
 * @param kind 页面背景类别
 * @returns 静态资源地址
 */
export const pageBackgroundURL = (kind: PageBackgroundKind) =>
  `${STATIC_ASSET_BASE_URL || '/design-assets'}/backgrounds/${PAGE_BACKGROUNDS[kind]}`
