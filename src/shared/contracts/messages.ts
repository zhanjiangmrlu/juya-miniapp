import type { CursorPage } from './common'
export interface MessageItem {
  created_at: string
  id: string
  read_at: string | null
  related_id: string | null
  related_type: string | null
  summary: string
  title: string
  type: string
}
export type MessagePage = CursorPage<MessageItem>
