import { FavoriteType } from '@/shared/enums/favorites'

/** 已冻结复习卡片不再有效时，需要读取最新快照重新建立会话 */
export const FAVORITE_REVIEW_REFRESH_CODES = ['REVIEW_SNAPSHOT_CHANGED', 'REVIEW_CARDS_INVALID']
export const FAVORITE_REVIEW_CHANGED_MESSAGE = '收藏已取消或更新，请刷新复习后重新查看'

/** 新快照与旧收藏类型的显式兼容映射 */
export const FAVORITE_SNAPSHOT_TYPE_MAP = {
  word: FavoriteType.VOCABULARY,
  chunk: FavoriteType.PHRASE,
  [FavoriteType.VOCABULARY]: FavoriteType.VOCABULARY,
  [FavoriteType.PHRASE]: FavoriteType.PHRASE
} as const

/** 将后端历史资料缺失字段转换为用户可理解的名称 */
export const FAVORITE_MISSING_FIELD_LABELS: Record<string, string> = {
  english: '英文',
  meaning_zh: '释义',
  chinese: '释义',
  source_sentence: '来源句',
  pronunciation: '发音',
  resource_version: '发音版本',
  content_version: '内容版本',
  revision_id: '内容版本',
  image_asset_id: '图片',
  explanation: '解释',
  phonetic: '音标'
}
