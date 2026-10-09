<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'

import FeedbackForm from '@/features/feedback/components/feedback-form.vue'
import PersonalPage from '@/features/profile/components/personal-page.vue'
import { useAnalyticsPage } from '@/services/analytics/use-analytics-page'
import { useFeedbackDraftStore } from '@/stores/feedback-draft'
const draft = useFeedbackDraftStore()
/** 保存入口自动带入的来源，query 为当前场景及页面定位 */
const capture = (query?: Record<string, string>) => {
  if (query?.sceneId || query?.pageLabel)
    draft.update({
      source: {
        scene_id: query.sceneId || '',
        scene_title: query.sceneTitle || '',
        page_label: query.pageLabel || '',
        source_locator: query.sourceLocator || ''
      }
    })
}
onLoad(capture)
useAnalyticsPage('sub-packages/feedback/create')
</script>
<template>
  <PersonalPage navigation="问题反馈" title="提交问题反馈" subtitle="选择问题类型，帮助我们定位问题"
    ><FeedbackForm
  /></PersonalPage>
</template>
