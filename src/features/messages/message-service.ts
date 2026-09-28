import type { HttpClient } from '@/services/http/client'
import type { MessageItem, MessagePage } from '@/shared/contracts/messages'

export interface MessageService {
  list(cursor?: string): Promise<MessagePage>
  markRead(id: string): Promise<MessageItem>
}

/** 创建站内消息服务，列表读取与已读命令均复用统一请求层。 */
export function createMessageService(client: HttpClient): MessageService {
  return {
    list: (cursor) =>
      client.get(`/api/v1/messages${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`),
    markRead: (id) => client.post(`/api/v1/messages/${encodeURIComponent(id)}/read`)
  }
}
