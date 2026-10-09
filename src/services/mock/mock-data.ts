import { MOCK_FIXTURES } from '@/services/mock/fixtures'

export const MOCK_FEEDBACK = {
  category: 'CONTENT',
  created_at: '2026-09-28T08:30:00Z',
  description: 'Castle Exhibit 第二句的中文释义似乎不准确。',
  id: 'feedback-001',
  reopen_count: 0,
  reply: '已核对并修正释义，感谢你的反馈。',
  resolved_at: '2026-09-28T10:30:00Z',
  screenshots: [],
  status: 'RESOLVED',
  supplements: [],
  title: 'Castle Exhibit 第二句释义'
}

export const MOCK_ROUTES: Record<string, unknown> = {
  'GET /api/v1/feedback': { has_more: false, items: [MOCK_FEEDBACK] },
  'GET /api/v1/home': MOCK_FIXTURES.home,
  'GET /api/v1/learning/catalog': MOCK_FIXTURES.catalog,
  'GET /api/v1/learning/modules': MOCK_FIXTURES.modules,
  'GET /api/v1/me': MOCK_FIXTURES.user,
  'GET /api/v1/me/contact': MOCK_FIXTURES.contact,
  'GET /api/v1/me/entitlements': {
    authorization_pending: false,
    formal: [
      {
        content_pack_id: 'pack-1',
        effective_at: '2026-09-01T00:00:00Z',
        expires_at: null,
        id: 'formal-1',
        status: 'ACTIVE',
        title: '正式内容包'
      }
    ],
    limited: [
      {
        activated_at: null,
        activity_id: 'activity-1',
        duration_days: 3,
        expires_at: null,
        id: 'limited-1',
        scene_count: 3,
        starts_before: '2026-10-01T08:00:00Z',
        status: 'PENDING',
        title: '3 天限时学习'
      }
    ],
    version: 'v1'
  },
  'GET /api/v1/messages': {
    items: [
      {
        created_at: '2026-09-28T10:30:00Z',
        id: 'message-1',
        read_at: null,
        related_id: 'feedback-001',
        related_type: 'FEEDBACK',
        summary: 'Castle Exhibit 第二句释义已核对处理。',
        title: '你的问题已有处理结果',
        type: 'SYSTEM'
      }
    ],
    next_cursor: null
  },
  'DELETE /api/v1/me/learning-data': null,
  'POST /api/v1/me/deletion': {
    completed_at: null,
    effective_at: '2026-10-05T08:30:00Z',
    id: 'deletion-1',
    requested_at: '2026-09-28T08:30:00Z',
    revoked_at: null,
    status: 'PENDING'
  },
  'POST /api/v1/me/deletion/revoke': {
    completed_at: null,
    effective_at: '2026-10-05T08:30:00Z',
    id: 'deletion-1',
    requested_at: '2026-09-28T08:30:00Z',
    revoked_at: '2026-09-28T11:30:00Z',
    status: 'REVOKED'
  },
  'POST /api/v1/feedback': { ...MOCK_FEEDBACK, id: 'feedback-created', status: 'PENDING' },
  'POST /api/v1/feedback/uploads': {
    fields: {
      key: 'feedback/mock-user/mock-image.jpg',
      policy: 'mock-policy',
      'Content-Type': 'image/jpeg',
      'x-oss-signature-version': 'OSS4-HMAC-SHA256',
      'x-oss-signature': 'mock-signature'
    },
    access_key_id: 'mock-access-key',
    content_type: 'image/jpeg',
    expires_at: '2026-09-28T08:35:00Z',
    host: 'https://mock-upload.juya.local',
    key: 'feedback/mock-user/mock-image.jpg',
    max_bytes: 5242880,
    policy: 'mock-policy',
    signature: 'mock-signature'
  },
  'POST /api/v1/session/refresh': {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token'
  },
  'POST /api/v1/session/wechat': {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token'
  }
}
