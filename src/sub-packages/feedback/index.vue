<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'

import AppButton from '@/components/app-button/app-button.vue'
import AppState from '@/components/app-state/app-state.vue'
import FeedbackCard from '@/features/feedback/components/feedback-card.vue'
import PersonalPage from '@/features/profile/components/personal-page.vue'
import PersonalSummary from '@/features/profile/components/personal-summary.vue'
import { getRuntimeServices } from '@/services/runtime'
import { NavigationType } from '@/shared/enums/navigation'
import { ButtonVariant } from '@/shared/enums/ui'
import { navigate } from '@/shared/navigation/navigate'

import type { FeedbackItem } from '@/shared/contracts/feedback'

const error = ref('')
const items = ref<FeedbackItem[]>([])

/** 读取当前用户的全部反馈状态 */
const loadFeedback = async () => {
  try {
    items.value = (await getRuntimeServices().feedback.list()).items
    error.value = ''
  } catch {
    error.value = '反馈加载失败，请重试'
  }
}

/** 打开指定反馈的时间线详情 */
const openFeedback = async (item: FeedbackItem) => {
  await navigate({
    type: NavigationType.NAVIGATE_TO,
    url: `/sub-packages/feedback/detail?id=${encodeURIComponent(item.id)}`
  })
}

/** 打开新反馈表单 */
const createFeedback = async () => {
  await navigate({ type: NavigationType.NAVIGATE_TO, url: '/sub-packages/feedback/create' })
}

onShow(loadFeedback)
</script>
<template>
  <PersonalPage title="我的反馈" subtitle="所有回复和补充保存在同一条时间线">
    <PersonalSummary
      label="反馈记录"
      :value="`${items.length} 条`"
      note="可查看处理状态和更新时间"
    />
    <text class="section-title">最近反馈</text
    ><view class="row-list"
      ><FeedbackCard v-for="item in items" :key="item.id" :item="item" @open="openFeedback"
    /></view>
    <AppState
      v-if="!items.length && !error"
      title="暂无反馈记录"
      icon-label="反馈"
      description="提交的问题会在这里保存记录"
    />
    <text v-if="error" class="form-error">{{ error }}</text
    ><AppButton
      v-if="error"
      label="重新加载"
      :variant="ButtonVariant.SECONDARY"
      @press="loadFeedback"
    />
    <template #actions><AppButton label="提交问题反馈" @press="createFeedback" /></template>
  </PersonalPage>
</template>
<style scoped lang="scss">
@use '../../features/profile/personal';
</style>
