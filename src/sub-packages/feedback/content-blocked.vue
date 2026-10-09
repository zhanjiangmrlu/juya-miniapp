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
useAnalyticsPage('sub-packages/feedback/content-blocked')
</script>
<template>
  <PersonalPage navigation="问题反馈" title="修改反馈内容" subtitle="请修改后再提交"
    ><FeedbackForm blocked
  /></PersonalPage>
</template>
