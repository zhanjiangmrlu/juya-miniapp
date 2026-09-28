<script setup lang="ts">
import { onLoad, onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

import AppButton from '@/components/app-button/app-button.vue'
import AppPage from '@/components/app-page/app-page.vue'
import AppState from '@/components/app-state/app-state.vue'
import PageHeader from '@/components/page-header/page-header.vue'
import FeedbackResolutionActions from '@/features/feedback/components/feedback-resolution-actions.vue'
import FeedbackStatus from '@/features/feedback/components/feedback-status.vue'
import FeedbackTimeline from '@/features/feedback/components/feedback-timeline.vue'
import { canSupplementFeedback, validateSupplement } from '@/features/feedback/feedback-form'
import { getRuntimeServices } from '@/services/runtime'
import { navigate } from '@/shared/navigation/navigate'

import type { FeedbackItem, FeedbackResolutionRequest } from '@/shared/contracts/feedback'

withDefaults(defineProps<{ resultMode?: boolean }>(), { resultMode: false })
const feedbackId = ref('')
const item = ref<FeedbackItem>()
const supplement = ref('')
const error = ref('')
const canSupplement = computed(() => (item.value ? canSupplementFeedback(item.value) : false))

/** 保存路由中的反馈标识，页面显示时再读取最新服务端投影。 */
function captureRoute(query?: Record<string, string | undefined>) {
  feedbackId.value = query?.id ?? ''
}

/** 读取反馈详情；无标识时保持明确空状态。 */
async function load() {
  if (!feedbackId.value) return
  item.value = await getRuntimeServices().feedback.get(feedbackId.value)
}

/** 同步补充说明输入。 */
function handleSupplementInput(event: unknown) {
  supplement.value = (event as { detail: { value: string } }).detail.value
}

/** 校验并提交补充内容，成功后重新读取完整时间线。 */
async function submitSupplement() {
  const result = validateSupplement(supplement.value)
  if (!result.valid || !result.normalized) {
    error.value = '补充说明需为 1 至 300 字'
    return
  }
  item.value = await getRuntimeServices().feedback.supplement(feedbackId.value, result.normalized)
  supplement.value = ''
  error.value = ''
}

/** 进入独立结果页，保持详情页专注于补充时间线。 */
async function openResolution() {
  await navigate({
    type: 'navigateTo',
    url: `/pages/feedback/resolution?id=${encodeURIComponent(feedbackId.value)}`
  })
}

/** 将已解决或一次重开动作提交服务端，并以响应状态刷新页面。 */
async function resolveFeedback(payload: FeedbackResolutionRequest) {
  item.value = await getRuntimeServices().feedback.resolve(feedbackId.value, payload)
  if (payload.action === 'REOPEN')
    await navigate({ type: 'redirectTo', url: `/pages/feedback/detail?id=${feedbackId.value}` })
}

onLoad(captureRoute)
onShow(load)
</script>

<template>
  <AppPage>
    <PageHeader
      eyebrow="处理进展会保留在这里"
      :title="resultMode ? '反馈处理结果' : '反馈详情与补充'"
    />
    <view v-if="item" class="feedback-detail">
      <view class="feedback-detail__summary">
        <view class="feedback-detail__summary-top">
          <text class="feedback-detail__title">{{ item.title || '问题反馈' }}</text>
          <FeedbackStatus :status="item.status" />
        </view>
        <text class="feedback-detail__number">反馈编号 {{ item.id }}</text>
      </view>

      <FeedbackTimeline :item="item" />

      <view v-if="canSupplement && !resultMode" class="feedback-detail__supplement">
        <text class="feedback-detail__section-title">补充信息</text>
        <textarea
          class="feedback-detail__textarea"
          maxlength="300"
          placeholder="请根据回复补充定位信息"
          :value="supplement"
          @input="handleSupplementInput"
        />
        <text v-if="error" class="feedback-detail__error">{{ error }}</text>
        <AppButton label="提交补充" @press="submitSupplement" />
      </view>

      <AppButton
        v-if="item.status === 'RESOLVED' && !resultMode"
        label="查看处理结果"
        variant="secondary"
        @press="openResolution"
      />
      <FeedbackResolutionActions v-if="resultMode" :item="item" @resolve="resolveFeedback" />
    </view>
    <AppState
      v-else
      description="请从我的反馈或站内消息进入有效记录。"
      icon-label="反馈记录"
      title="暂未找到反馈详情"
    />
  </AppPage>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.feedback-detail {
  display: grid;
  gap: 22rpx;

  &__summary,
  &__supplement {
    padding: 28rpx;
    border: 2rpx solid tokens.$color-border;
    border-radius: tokens.$radius-large;
    background: rgb(255 255 255 / 78%);
  }

  &__summary-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18rpx;
  }

  &__title,
  &__section-title {
    font-size: 28rpx;
    font-weight: 700;
  }

  &__number {
    display: block;
    margin-top: 14rpx;
    color: tokens.$color-text-muted;
    font-size: 21rpx;
  }

  &__section-title {
    display: block;
    margin-bottom: 16rpx;
  }

  &__textarea {
    box-sizing: border-box;
    width: 100%;
    height: 190rpx;
    margin-bottom: 18rpx;
    padding: 22rpx;
    border: 2rpx solid tokens.$color-border;
    border-radius: tokens.$radius-medium;
    background: tokens.$color-white;
    font-size: 24rpx;
  }

  &__error {
    display: block;
    margin: -4rpx 0 14rpx;
    color: tokens.$color-danger;
    font-size: 22rpx;
  }
}
</style>
