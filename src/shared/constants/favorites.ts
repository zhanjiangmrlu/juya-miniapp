import { FavoriteType } from '@/shared/enums/favorites'

/** 新快照与旧收藏类型的显式兼容映射 */
export const FAVORITE_SNAPSHOT_TYPE_MAP = {
  word: FavoriteType.VOCABULARY,
  chunk: FavoriteType.PHRASE,
  [FavoriteType.VOCABULARY]: FavoriteType.VOCABULARY,
  [FavoriteType.PHRASE]: FavoriteType.PHRASE
} as const
