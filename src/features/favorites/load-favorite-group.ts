import type { FavoriteService } from '@/shared/types/favorites'

import { presentFavorites } from './favorite-presenter'

/** 只读取当前独立完整快照，service 为当前账号服务，id 为选中收藏标识 */
export const loadFavoriteGroup = async (service: FavoriteService, id: string) => {
  const item = await service.get(id)
  if (item.active === false) throw new Error('收藏已取消')
  return { item, group: presentFavorites([item])[0] }
}
