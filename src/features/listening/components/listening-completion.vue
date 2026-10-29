<script setup lang="ts">
import type { ListeningCompletionProps } from '@/shared/types/listening-components'
defineProps<ListeningCompletionProps>()
defineEmits<{ stay: []; next: []; topic: []; retry: [] }>()
</script>
<template>
  <view class="completion-veil" @touchmove.stop.prevent>
    <view class="completion-dialog" role="dialog" aria-modal="true" aria-label="学习完成">
      <image
        class="success-mark"
        src="/static/listening/r17-complete.svg"
        mode="aspectFit"
        aria-hidden="true"
      />
      <text class="completion-title">本篇学习已完成</text>
      <text v-if="result" class="completion-copy"
        >已学听读{{ result.statistics.completed_articles }}篇 ·
        {{ result.first_checkin_today ? '今日打卡成功' : '今日已打卡' }}</text
      ><text v-else class="completion-copy">本篇已完成，学习记录已保存</text>
      <view v-if="next" class="next-summary">
        <text class="next-label">下一篇</text><text class="next-title">{{ next.title_zh }}</text
        ><text class="next-english">{{ next.title_en }}</text>
      </view>
      <view v-else-if="ended" class="next-summary"
        ><text class="next-title">本主题已学到最后一篇</text
        ><text class="next-meta">可以回到主题列表，选择下一段生活。</text></view
      >
      <text v-if="error" class="completion-error" role="alert">{{ error }}</text>
      <button
        v-if="next"
        class="primary completion-action"
        data-action="next"
        :disabled="busy"
        @click="$emit('next')"
      >
        下一篇
      </button>
      <button
        v-else-if="ended"
        class="primary completion-action"
        data-action="topic"
        @click="$emit('topic')"
      >
        返回主题列表
      </button>
      <button v-else class="primary completion-action" :disabled="busy" @click="$emit('retry')">
        {{ busy ? '正在获取下一篇' : '重新获取下一篇' }}
      </button>
      <button class="text-button completion-stay" data-action="stay" @click="$emit('stay')">
        留在本篇
      </button>
    </view>
  </view>
</template>
<style scoped lang="scss">
.completion-veil {
  position: fixed;
  z-index: 105;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 46rpx;
  background: rgb(43 68 56 / 30%);

  .completion-dialog {
    width: 100%;
    max-width: 657.692rpx;
    max-height: 85vh;
    overflow-y: auto;
    border-radius: 30.769rpx;
    background: #fffcf5;
    padding: 44.231rpx;
    text-align: center;
  }

  .success-mark {
    width: 32px;
    height: 32px;
    margin: 0 auto 28rpx;
  }

  .completion-title {
    display: block;
    font-size: 40.385rpx;
    font-weight: 700;
  }

  .completion-copy {
    display: block;
    margin-top: 14rpx;
    font-size: 25rpx;
    line-height: 1.8;
    color: #586c5b;
  }

  .next-summary {
    margin: 30rpx 0;
    padding: 26rpx;
    border-radius: 16rpx;
    background: #edf2e5;
    text-align: left;
  }

  .next-label,
  .next-meta {
    display: block;
    font-size: 25rpx;
    line-height: 1.7;
    color: #586c5b;
  }

  .next-label {
    font-weight: 700;
  }

  .next-title {
    display: block;
    margin: 10rpx 0;
    font-size: 25rpx;
    font-weight: 400;
  }

  .next-english {
    display: block;
    margin-bottom: 10rpx;
    font-size: 25rpx;
    font-family: var(--app-latin-font, sans-serif);
  }

  .completion-action,
  .completion-stay {
    width: 100%;
    min-height: 44px;
    font-size: 26rpx;
  }

  .completion-stay {
    margin-top: 14rpx;
  }

  .completion-error {
    display: block;
    margin: 20rpx 0;
    color: #97442d;
    font-size: 24rpx;
  }
}
</style>
