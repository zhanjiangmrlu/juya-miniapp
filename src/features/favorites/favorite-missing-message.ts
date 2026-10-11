import { FAVORITE_MISSING_FIELD_LABELS } from '@/shared/constants/favorites'

import type { FavoriteItem } from '@/shared/contracts/favorites'

/** 说明保存资料的明确缺失状态，item为本人历史快照，不借当前原文补写 */
export const getFavoriteMissingMessage = (item: FavoriteItem) => {
  if (!item.legacy_incomplete && !item.missing_fields?.length) return ''
  const labels = [
    ...new Set(
      (item.missing_fields ?? [])
        .filter((field) =>
          Object.prototype.hasOwnProperty.call(FAVORITE_MISSING_FIELD_LABELS, field)
        )
        .map((field) => FAVORITE_MISSING_FIELD_LABELS[field])
    )
  ]
  return `历史收藏资料待补齐${labels.length ? `：${labels.join('、')}` : ''}`
}
