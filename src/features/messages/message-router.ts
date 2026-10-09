import type { MessageItem } from '@/shared/contracts/messages'

/** 按消息关联对象生成站内页面地址，未知类型安全回退到消息列表。 */
export function resolveMessageRoute(message: MessageItem): string {
  const relatedId = message.related_id ? encodeURIComponent(message.related_id) : ''
  if (message.related_type === 'FEEDBACK' && relatedId)
    return `/sub-packages/feedback/detail?id=${relatedId}`
  if (message.related_type === 'ENTITLEMENT' && relatedId)
    return `/sub-packages/entitlement/index?id=${relatedId}`
  return '/sub-packages/feedback/messages'
}

/** 保证先完成已读写入，再进入关联页面，防止返回后红点短暂回闪。 */
export async function openMessage(
  message: MessageItem,
  markRead: (id: string) => Promise<unknown>,
  navigate: (url: string) => Promise<unknown>
): Promise<void> {
  if (!message.read_at) await markRead(message.id)
  await navigate(resolveMessageRoute(message))
}
