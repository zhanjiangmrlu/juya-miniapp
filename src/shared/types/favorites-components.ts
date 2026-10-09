import type { FavoriteItem } from '@/shared/contracts/favorites'
import type { FavoriteType, ReviewCardFace } from '@/shared/enums/favorites'
import type { FavoriteGroup, FavoriteSourceViewModel } from '@/shared/types/favorites'

/** FavoriteBankPage 输入属性 */
export type FavoriteBankPageProps = { initialTab?: FavoriteType }

/** FavoriteList 输入属性 */
export type FavoriteListProps = { groups: FavoriteGroup[] }

/** FavoriteList 事件契约 */
export type FavoriteListEmits = { select: [group: FavoriteGroup] }

/** ReviewCard 输入属性 */
export type ReviewCardProps = { face: ReviewCardFace; item: FavoriteItem }

/** ReviewCard 事件契约 */
export type ReviewCardEmits = { flip: [] }

/** ReviewPageView 输入属性 */
export type ReviewPageViewProps = { face: ReviewCardFace }

/** SourceList 输入属性 */
export type SourceListProps = { sources: FavoriteSourceViewModel[] }

/** SourceList 事件契约 */
export type SourceListEmits = { open: [route: string] }
