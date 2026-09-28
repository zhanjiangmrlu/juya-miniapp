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
  supplement(id: string, text: string): Promise<FeedbackItem>
}

/** 创建反馈服务，幂等键和认证由统一请求层集中处理。 */
export function createFeedbackService(client: HttpClient): FeedbackService {
  return {
    create: (payload) => client.post('/api/v1/feedback', payload),
    get: (id) => client.get(`/api/v1/feedback/${encodeURIComponent(id)}`),
    getUploadCredential: (contentType) =>
      client.post(
        `/api/v1/feedback/uploads?content_type=${encodeURIComponent(contentType)}`,
        undefined,
        { idempotencyKey: false }
      ),
    list: () => client.get('/api/v1/feedback'),
    resolve: (id, payload) =>
      client.post(`/api/v1/feedback/${encodeURIComponent(id)}/resolution`, payload),
    supplement: (id, text) =>
      client.post(`/api/v1/feedback/${encodeURIComponent(id)}/supplements`, { text })
  }
}
