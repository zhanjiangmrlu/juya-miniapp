<script setup lang="ts">
import { formatFeedbackTime } from '@/features/feedback/feedback-presenter'

import type { MessageItem } from '@/shared/contracts/messages'

defineProps<{ item: MessageItem }>()
const emit = defineEmits<{ open: [item: MessageItem] }>()

/** 将消息点击交给页面完成先已读后导航的事务顺序。 */
function handleOpen(item: MessageItem) {
  emit('open', item)
}
</script>

<template>
  <button class="message-card" @click="handleOpen(item)">
    <view class="message-card__heading">
      <text class="message-card__title">{{ item.title }}</text>
      <text v-if="!item.read_at" class="message-card__unread">新</text>
    </view>
    <text class="message-card__summary">{{ item.summary }}</text>
    <text class="message-card__time">{{ formatFeedbackTime(item.created_at) }}</text>
  </button>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.message-card {
  width: 100%;
  margin: 0;
  padding: 28rpx;
  border: 2rpx solid tokens.$color-border;
  border-radius: tokens.$radius-large;
  background: rgb(255 255 255 / 80%);
  color: tokens.$color-text;
  text-align: left;

  &__heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16rpx;
  }

  &__title {
    font-size: 28rpx;
    font-weight: 700;
  }

  &__unread {
    min-width: 44rpx;
    padding: 6rpx 10rpx;
    border-radius: tokens.$radius-pill;
    background: tokens.$color-danger;
    color: tokens.$color-white;
    font-size: 20rpx;
    text-align: center;
  }

  &__summary,
  &__time {
    display: block;
  }

  &__summary {
    margin-top: 14rpx;
    color: tokens.$color-text-muted;
    font-size: 24rpx;
    line-height: 1.5;
  }

  &__time {
    margin-top: 18rpx;
    color: tokens.$color-text-muted;
    font-size: 21rpx;
  }
}
</style>
