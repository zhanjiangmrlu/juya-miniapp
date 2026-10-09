import type { MessageItem, MessagePage } from '@/shared/contracts/messages'

export interface MessageService {
  list(cursor?: string): Promise<MessagePage>
  markRead(id: string): Promise<MessageItem>
}
