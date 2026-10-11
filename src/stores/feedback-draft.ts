import { defineStore } from 'pinia'
import { reactive, watch } from 'vue'

import { useSessionStore } from '@/stores/session'

import type { FeedbackDraft } from '@/shared/types/feedback'
/** 创建不持久化敏感正文的空反馈草稿 */
const empty = (): FeedbackDraft => ({
  category: '',
  description: '',
  screenshots: [],
  source: undefined
})
export const useFeedbackDraftStore = defineStore('feedback-draft', () => {
  const draft = reactive<FeedbackDraft>(empty())
  const session = useSessionStore()
  /** 合并本机草稿，patch 为本次更新的表单或来源字段 */
  const update = (patch: Partial<FeedbackDraft>) => {
    Object.assign(draft, patch)
  }
  /** 成功提交或主动放弃后移除正文、附件及旧来源 */
  const clear = () => {
    Object.assign(draft, empty())
  }
  // Store在表单卸载后仍存活，身份切换或退出必须全局清草稿；本人清学习不涉及反馈草稿
  watch(
    () => [session.isAuthenticated, session.profile?.juya_id] as const,
    (next, previous) => {
      if (next[0] !== previous[0] || next[1] !== previous[1]) clear()
    },
    { flush: 'sync' }
  )
  return { clear, draft, update }
})
