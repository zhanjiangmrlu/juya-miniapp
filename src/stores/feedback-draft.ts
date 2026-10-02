import { defineStore } from 'pinia'
import { reactive } from 'vue'

import type { FeedbackDraft } from '@/features/feedback/feedback-form'
/** 创建不持久化敏感正文的空反馈草稿 */
const empty = (): FeedbackDraft => ({
  category: '',
  description: '',
  screenshots: [],
  source: undefined
})
export const useFeedbackDraftStore = defineStore('feedback-draft', () => {
  const draft = reactive<FeedbackDraft>(empty())
  /** 合并本机草稿，patch 为本次更新的表单或来源字段 */
  const update = (patch: Partial<FeedbackDraft>) => {
    Object.assign(draft, patch)
  }
  /** 成功提交或主动放弃后移除正文、附件及旧来源 */
  const clear = () => {
    Object.assign(draft, empty())
  }
  return { clear, draft, update }
})
