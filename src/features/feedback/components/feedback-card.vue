<script setup lang="ts">
import FeedbackStatus from '@/features/feedback/components/feedback-status.vue'
import { formatFeedbackTime } from '@/features/feedback/feedback-presenter'

import type { FeedbackItem } from '@/shared/contracts/feedback'

defineProps<{ item: FeedbackItem }>()
const emit = defineEmits<{ open: [item: FeedbackItem] }>()

/** 将整张反馈卡转换为详情打开事件。 */
function handleOpen(item: FeedbackItem) {
  emit('open', item)
}
</script>

<template>
  <button class="feedback-card" @click="handleOpen(item)">
    <view class="feedback-card__top">
      <text class="feedback-card__title">{{ item.title || item.description }}</text>
      <FeedbackStatus :status="item.status" />
    </view>
    <text class="feedback-card__description">{{ item.description }}</text>
    <text class="feedback-card__meta">{{ formatFeedbackTime(item.created_at) }} · 查看详情</text>
  </button>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.feedback-card {
  width: 100%;
  margin: 0;
  padding: 28rpx;
  border: 2rpx solid tokens.$color-border;
  border-radius: tokens.$radius-large;
  background: rgb(255 255 255 / 78%);
  color: tokens.$color-text;
  text-align: left;

  &__top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20rpx;
  }

  &__title {
    overflow: hidden;
    font-size: 28rpx;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__description,
  &__meta {
    display: block;
  }

  &__description {
    display: -webkit-box;
    overflow: hidden;
    margin-top: 16rpx;
    color: tokens.$color-text-muted;
    font-size: 24rpx;
    line-height: 1.55;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  &__meta {
    margin-top: 20rpx;
    color: tokens.$color-primary;
    font-size: 21rpx;
  }
}
</style>
