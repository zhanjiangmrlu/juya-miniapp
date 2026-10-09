import type { MessageItem } from '@/shared/contracts/messages'

/** MessageCard 输入属性 */
export type MessageCardProps = { item: MessageItem }

/** MessageCard 事件契约 */
export type MessageCardEmits = { open: [item: MessageItem] }
