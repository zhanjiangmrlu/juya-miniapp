import type { HttpClient } from '@/services/http/client'
import type {
  CreateFeedbackRequest,
  FeedbackItem,
  FeedbackListResponse,
  FeedbackResolutionRequest,
  FeedbackUploadCredential
} from '@/shared/contracts/feedback'

export interface FeedbackService {
  create(payload: CreateFeedbackRequest): Promise<FeedbackItem>
  get(id: string): Promise<FeedbackItem>
  getUploadCredential(contentType: string): Promise<FeedbackUploadCredential>
  list(): Promise<FeedbackListResponse>
  resolve(id: string, payload: FeedbackResolutionRequest): Promise<FeedbackItem>
  supplement(id: string, text: string, screenshots?: string[]): Promise<FeedbackItem>
}

/** 创建反馈服务，client 为统一认证与幂等请求客户端 */
export const createFeedbackService = (client: HttpClient): FeedbackService => {
  return {
    /** 创建反馈，payload 为已校验的问题和截图对象键 */
    create: (payload) => client.post('/api/v1/feedback', payload),
    /** 获取本人反馈，id 为反馈标识 */
    get: (id) => client.get(`/api/v1/feedback/${encodeURIComponent(id)}`),
    /** 获取上传凭证，contentType 为截图的实际 MIME 类型 */
    getUploadCredential: (contentType) =>
      client.post(
        `/api/v1/feedback/uploads?content_type=${encodeURIComponent(contentType)}`,
        undefined,
        { idempotencyKey: false }
      ),
    /** 读取本人反馈列表 */
    list: () => client.get('/api/v1/feedback'),
    /** 确认解决或重开，id 为反馈标识，payload 为本次确认结果与原因 */
    resolve: (id, payload) =>
      client.post(`/api/v1/feedback/${encodeURIComponent(id)}/resolution`, payload),
    /** 在同一记录补充，id 为反馈标识，text 为问题说明，screenshots 为可选上传对象键 */
    supplement: (id, text, screenshots = []) =>
      client.post(`/api/v1/feedback/${encodeURIComponent(id)}/supplements`, { text, screenshots })
  }
}
