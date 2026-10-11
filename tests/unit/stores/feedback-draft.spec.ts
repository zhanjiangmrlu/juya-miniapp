import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { useFeedbackDraftStore } from '@/stores/feedback-draft'
import { useSessionStore } from '@/stores/session'

import type { UserProfile } from '@/shared/contracts/profile'

beforeEach(() => setActivePinia(createPinia()))

describe('独立于表单组件的反馈草稿身份边界', () => {
  it('表单不在场时切换本人句芽号也清除旧正文、截图及来源', () => {
    const session = useSessionStore()
    session.accessToken = 'test-session'
    session.profile = { juya_id: 'account-a' } as UserProfile
    const store = useFeedbackDraftStore()
    store.update({
      category: 'CONTENT',
      description: 'A的未提交问题',
      screenshots: [{ path: '/a.png', mimeType: 'image/png', size: 2 }],
      source: { scene_id: 'a-scene' }
    })
    session.profile = { juya_id: 'account-b' } as UserProfile
    expect(store.draft).toEqual({
      category: '',
      description: '',
      screenshots: [],
      source: undefined
    })
  })

  it('认证退出后即使旧本人档案尚未清除也不保留草稿', () => {
    const session = useSessionStore()
    session.accessToken = 'test-session'
    session.profile = { juya_id: 'account-a' } as UserProfile
    const store = useFeedbackDraftStore()
    store.update({ description: '原账号描述' })
    session.accessToken = undefined
    expect(store.draft.description).toBe('')
  })

  it('仅学习清理、令牌刷新及同一本人档案刷新不删除本人草稿', () => {
    const session = useSessionStore()
    session.accessToken = 'test-session'
    session.profile = { juya_id: 'account-a' } as UserProfile
    const store = useFeedbackDraftStore()
    store.update({ description: '仍要补充的问题', source: { page_label: '首页' } })
    session.invalidateLearningData()
    session.accessToken = 'refreshed-session'
    session.profile = { juya_id: 'account-a', nickname: '新昵称' } as UserProfile
    expect(store.draft.description).toBe('仍要补充的问题')
    expect(store.draft.source).toEqual({ page_label: '首页' })
  })
})
