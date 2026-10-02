import type { MessageService } from './message-service'
import type { MessageItem } from '@/shared/contracts/messages'
/** 读取完整消息列表并按标识去重，service 为本人消息接口 */
export const loadAllMessages = async (service: MessageService): Promise<MessageItem[]> => {
  const items = new Map<string, MessageItem>()
  const visited = new Set<string>()
  let cursor: string | undefined
  do {
    if (cursor && visited.has(cursor)) throw new Error('消息分页游标重复')
    if (cursor) visited.add(cursor)
    const page = await service.list(cursor)
    page.items.forEach((item) => items.set(item.id, item))
    cursor = page.next_cursor || undefined
  } while (cursor)
  return [...items.values()]
}
