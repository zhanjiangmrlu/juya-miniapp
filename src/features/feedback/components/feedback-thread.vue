<script setup lang="ts">
import { ref } from 'vue'

import { feedbackTime } from '@/features/feedback/feedback-model'
import { session } from '@/services/api'
import { resourceURL } from '@/services/platform'
import { FEEDBACK_STATUS_LABELS } from '@/shared/constants/feedback'

import type { FeedbackImage } from '@/shared/types/feedback'
import type { FeedbackThreadProps } from '@/shared/types/feedback-components'
defineProps<FeedbackThreadProps>()
const imageError = ref('')
/** 每次打开私有图重新确认会话及归属，失效授权只续签不重传
 * @param image 当前时间线的服务端截图
 */
const preview = async (image: FeedbackImage) => {
  imageError.value = ''
  try {
    const current = await session.request<FeedbackImage>(
      `/api/mini/v1/feedback/images/${encodeURIComponent(image.id)}/url`
    )
    uni.previewImage({ urls: [resourceURL(current.url)] })
  } catch (reason) {
    imageError.value = reason instanceof Error ? reason.message : '截图暂未获取，请重试'
  }
}
</script>
<template>
  <view class="feedback-thread">
    <view
      v-for="event in feedback.events"
      :key="event.id"
      class="feedback-message"
      :class="{ admin: event.actor === 'admin' }"
    >
      <view class="message-heading between"
        ><text class="actor">{{ event.actor === 'user' ? '我' : '句芽英语' }}</text
        ><text class="time">{{ feedbackTime(event.created_at) }}</text></view
      >
      <text v-if="event.text" class="message-text">{{ event.text }}</text>
      <text v-if="event.status" class="status-change"
        >状态更新为{{ FEEDBACK_STATUS_LABELS[event.status] }}</text
      >
      <view v-if="event.images.length" class="message-images"
        ><button
          v-for="image in event.images"
          :key="image.id"
          aria-label="查看反馈截图"
          @click="preview(image)"
        >
          <image
            :src="resourceURL(image.url)"
            mode="aspectFill"
            @error="imageError = '截图授权可能已过期，点击重新获取'"
          /></button
      ></view>
    </view>
    <view v-if="imageError" class="notice error" role="alert">{{ imageError }}</view>
  </view>
</template>
<style scoped lang="scss">
.feedback-thread {
  margin-top: 15.385rpx;

  .feedback-message {
    padding: 34.615rpx 0;
    border-bottom: 1px solid #dfe5d8;
    margin-bottom: 26.923rpx;

    &.admin {
      padding: 34.615rpx 26.923rpx;
      background: #e4f0db;
      border-radius: 19.231rpx;
      border-bottom: 0;
    }

    .message-heading {
      gap: 15.385rpx;
      align-items: center;
      margin-bottom: 23.077rpx;
    }

    .actor {
      font-size: 26.923rpx;
      font-weight: 700;
      line-height: 44.423rpx;
    }

    .time {
      font-size: 21.154rpx;
      line-height: 31.731rpx;
      color: #586c5b;
    }

    .message-text {
      display: block;
      font-size: 28.846rpx;
      line-height: 50.481rpx;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    .status-change {
      display: block;
      margin-top: 11.538rpx;
      font-size: 23.077rpx;
      color: #586c5b;
    }
  }

  .message-images {
    display: flex;
    gap: 15.385rpx;
    flex-wrap: wrap;
    margin-top: 19.231rpx;

    button {
      padding: 0;
      width: 150rpx;
      height: 150rpx;
      overflow: hidden;
    }

    image {
      width: 150rpx;
      height: 150rpx;
    }
  }
}
</style>
