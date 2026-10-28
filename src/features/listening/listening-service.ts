import { operations, session } from '@/services/api'
import { ApiError } from '@/services/errors'
import { resourceURL } from '@/services/platform'
import { LISTENING_API } from '@/shared/constants/listening'

import type {
  ListeningArticle,
  ListeningHome,
  ListeningProgress,
  ListeningSummary
} from '@/shared/types/listening'
/** 读取听读双模块首页真实权限与继续学习目标 */
export const getListeningHome = () => session.request<ListeningHome>(`${LISTENING_API}/home`)
/** 读取当前可学文章；拒绝时不回退缓存正文
 * @param id 稳定文章身份
 */
export const getListeningArticle = (id: string, queueToken = '') =>
  session.request<ListeningArticle>(
    `${LISTENING_API}/articles/${encodeURIComponent(id)}${queueToken ? `?queue_token=${encodeURIComponent(queueToken)}` : ''}`
  )
/** 兼容旧版仅存元数据的未知记录，先查回执再明确确认同账号同版本正文
 * @param action 当前待确认的听读操作
 * @param path 当前文章的业务路径
 * @param body 用户本次明确重试的固定正文
 */
const recoverListening = async <T>(action: string, path: string, body?: unknown) => {
  const owner = session.userId()
  try {
    return await operations.recover<T>(action)
  } catch (reason) {
    if (!(reason instanceof ApiError) || reason.code !== 'operation_unknown') throw reason
    const version = (body as { version_id?: string } | undefined)?.version_id
    const articleId = /^\/articles\/([^/]+)\//.exec(path)?.[1]
    if (articleId && version) {
      const current = await session.request<ListeningSummary>(
        `${LISTENING_API}/articles/${articleId}/summary`
      )
      if (current.version_id !== version)
        throw new ApiError('listening_version_changed', '文章版本已变化，请刷新后确认', 409)
    }
    const confirmed = await new Promise<boolean>((resolve) =>
      uni.showModal({
        title: '确认恢复上次操作',
        content:
          '尚未查到上次结果。是否以当前显示的文章版本和操作内容恢复原操作？仍使用原操作标识，不会另建一次提交。',
        success: (result) => resolve(result.confirm),
        fail: () => resolve(false)
      })
    )
    if (!confirmed) throw new ApiError('operation_pending', '上次操作仍待确认，可稍后重试')
    if (owner !== session.userId())
      throw new ApiError('session_changed', '账号已变化，请刷新当前页面')
    return operations.rebind<T>(action, body)
  }
}
/** 文章写操作沿用真实结果查询和幂等恢复
 * @param action 页面操作身份
 * @param path 听读子域接口
 * @param method 明确写方法
 * @param body 固定业务正文
 */
export const writeListening = async <T>(
  action: string,
  path: string,
  method: string,
  body?: unknown
): Promise<T> => {
  if (operations.pending(action)) {
    const result = await recoverListening<T>(action, path, body)
    if (result) return result
  }
  return operations.run<T>(action, `${LISTENING_API}${path}`, method, body, {
    persistBody: /^listening-(complete|favorite|progress|unfavorite):/.test(action)
  })
}
/** 保存同版本阅读状态，完成成绩单独提交
 * @param id 本篇稳定身份
 * @param progress 当前真实阅读位置与媒体状态
 */
export const saveListeningProgress = async (id: string, progress: ListeningProgress) => {
  const action = `listening-progress:${id}`
  if (operations.pending(action))
    await recoverListening<ListeningProgress>(action, `/articles/${id}/progress`, progress)
  return operations.run<ListeningProgress>(
    action,
    `${LISTENING_API}/articles/${id}/progress`,
    'PUT',
    progress,
    { persistBody: true }
  )
}
/** 将受保护缩略图换成绑定当前会话的短期图片票据
 * @param path 服务端当前发布版本的安全缩略图相对地址
 */
export const listeningThumbnail = async (path: string) => {
  if (!/^\/api\/mini\/v1\/listening\/articles\/[^/?]+\/thumbnail\?version_id=[^&]+$/.test(path))
    throw new Error('缩略图地址暂不可用')
  const grant = await session.request<{ url: string }>(
    path.replace('/thumbnail?', '/thumbnail-ticket?')
  )
  return resourceURL(grant.url)
}
/** 获取仍需服务端逐次验权的短期媒体凭证
 * @param article 当前有效发布文章
 * @param mediaId 本篇音频或原图资源
 */
export const listeningMedia = async (article: ListeningArticle, mediaId: string) => {
  const value = await writeListening<{ url: string; expires_at: string }>(
    `listening-media:${article.id}:${mediaId}`,
    `/articles/${article.id}/media-ticket`,
    'POST',
    { version_id: article.version_id, media_id: mediaId }
  )
  return resourceURL(value.url)
}
/** 打开文章详情，受限历史仍可显示安全摘要
 * @param article 真实服务端文章摘要
 * @param queueToken 本轮冻结的同主题队列凭证
 * @param replace 同队列推进时替换当前详情，保留来源页面
 */
export const openListeningArticle = (article: ListeningSummary, queueToken = '', replace = false) =>
  new Promise<void>((resolve, reject) => {
    const options = {
      url: `/sub-packages/listening/article?id=${encodeURIComponent(article.id)}${queueToken ? `&queue_token=${encodeURIComponent(queueToken)}` : ''}`,
      success: () => resolve(),
      fail: () => reject(new Error('下一篇打开失败，请重试'))
    }
    if (replace) uni.redirectTo(options)
    else uni.navigateTo(options)
  })
