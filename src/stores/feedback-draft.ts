import { defineStore } from 'pinia'
import { reactive } from 'vue'

import type { FeedbackDraft } from '@/features/feedback/feedback-form'

/** 创建空白反馈草稿，所有页面复用同一字段结构。 */
function createEmptyDraft(): FeedbackDraft {
  return { category: '', description: '', screenshots: [] }
}

export const useFeedbackDraftStore = defineStore('feedback-draft', () => {
  const draft = reactive<FeedbackDraft>(createEmptyDraft())

  /** 合并表单字段并保留未修改内容。 */
  function update(patch: Partial<FeedbackDraft>) {
    Object.assign(draft, patch)
  }

  /** 在提交成功或用户主动放弃时清空本地敏感草稿。 */
  function clear() {
    Object.assign(draft, createEmptyDraft())
  }

  return { clear, draft, update }
})
