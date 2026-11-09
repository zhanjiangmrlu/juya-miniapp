import type { AnalyticsPageContext, AnalyticsProperties } from '@/shared/types/analytics'

/** 从原生页面仅读取已知内容路由的编号，不传递完整查询或私人对象编号
 * @param page 当前最上层原生页面的路径和启动参数
 */
export const analyticsPageProperties = (page?: AnalyticsPageContext): AnalyticsProperties => {
  const id = page?.options?.id
  if (typeof id !== 'string' || !/^[\w-]{1,128}$/.test(id)) return {}
  if (
    page?.route === 'sub-packages/scenes/detail' ||
    page?.route === 'sub-packages/scenes/image-preview'
  )
    return { content_type: 'scene', content_id: id }
  if (page?.route === 'sub-packages/listening/article')
    return { content_type: 'listening', content_id: id }
  return {}
}
