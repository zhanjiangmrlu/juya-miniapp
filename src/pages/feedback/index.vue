<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'

import AppButton from '@/components/app-button/app-button.vue'
import AppPage from '@/components/app-page/app-page.vue'
import AppState from '@/components/app-state/app-state.vue'
import PageHeader from '@/components/page-header/page-header.vue'
import FeedbackCard from '@/features/feedback/components/feedback-card.vue'
import { getRuntimeServices } from '@/services/runtime'
import { navigate } from '@/shared/navigation/navigate'

import type { FeedbackItem } from '@/shared/contracts/feedback'

const items = ref<FeedbackItem[]>([])

/** 读取当前用户的全部反馈状态。 */
async function loadFeedback() {
  items.value = (await getRuntimeServices().feedback.list()).items
}

/** 打开指定反馈的时间线详情。 */
async function openFeedback(item: FeedbackItem) {
  await navigate({
    type: 'navigateTo',
    url: `/pages/feedback/detail?id=${encodeURIComponent(item.id)}`
  })
}

/** 打开新反馈表单。 */
async function createFeedback() {
  await navigate({ type: 'navigateTo', url: '/pages/feedback/create' })
}

onShow(loadFeedback)
</script>

<template>
  <AppPage>
    <PageHeader eyebrow="问题反馈不是即时聊天" title="我的反馈" />
    <view class="feedback-list">
      <FeedbackCard v-for="item in items" :key="item.id" :item="item" @open="openFeedback" />
      <AppState
        v-if="items.length === 0"
        description="遇到内容、发音、显示或功能问题时，可以提交反馈。"
        icon-label="反馈"
        title="暂无反馈记录"
      />
    </view>
    <AppButton label="提交新反馈" @press="createFeedback" />
  </AppPage>
</template>

<style scoped lang="scss">
@use '@/styles/mixins.scss' as mixins;

.feedback-list {
  display: grid;
  margin-bottom: 24rpx;
  gap: 18rpx;

  @include mixins.tablet {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
