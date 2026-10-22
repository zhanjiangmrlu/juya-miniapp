<script setup lang="ts">
import { ref } from 'vue'

import { BRAND_SHARE_TIMELINE, COMPLETE_APP_GUIDANCE } from '@/shared/constants/share'

import type { PublicSceneShare } from '@/shared/types/share'

defineProps<{ summary?: PublicSceneShare | null; image?: string; busy?: boolean; error?: string }>()
defineEmits<{ retry: [] }>()
const guidance = ref(false)
</script>
<template>
  <view class="share-summary">
    <template v-if="!busy && !error">
      <image
        class="summary-cover"
        :src="image || BRAND_SHARE_TIMELINE"
        mode="aspectFit"
        :alt="summary?.name || '句芽英语'"
      />
      <text class="summary-title">{{ summary?.name || '句芽英语' }}</text>
      <text v-if="summary?.title_en" class="summary-english">{{ summary.title_en }}</text>
      <text class="summary-description">在真实场景里学英语</text>
    </template>
    <text v-else class="summary-message" role="status">{{
      busy ? '正在获取分享摘要…' : error
    }}</text>
    <button v-if="error" class="text-button" @click="$emit('retry')">重新获取摘要</button>
    <button class="primary" @click="guidance = true">打开完整小程序</button>
    <text v-if="guidance" class="summary-guidance" role="status">{{ COMPLETE_APP_GUIDANCE }}</text>
  </view>
</template>
<style scoped lang="scss">
.share-summary {
  .summary-cover {
    display: block;
    width: 100%;
    height: 634.615rpx;
    margin-bottom: 53.846rpx;
    border-radius: 23.077rpx;
  }

  .summary-title {
    display: block;
    font-size: 46.154rpx;
    font-weight: 700;
    line-height: 64.615rpx;
  }

  .summary-english {
    display: block;
    font-family: Fraunces, Georgia, serif;
    font-size: 42.308rpx;
    line-height: 60.077rpx;
    letter-spacing: -0.02em;
  }

  .summary-description {
    display: block;
    margin-top: 53.846rpx;
    color: #586c5b;
    font-size: 30.769rpx;
    line-height: 49.231rpx;
  }

  .summary-title + .summary-description {
    margin-top: 0;
  }

  .primary {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 76.923rpx;
    margin-top: 53.846rpx;
    padding: 15.385rpx 26.923rpx;
    border: 1px solid #c8e2b5;
    border-radius: 19.231rpx;
    background: #c8e2b5;
    color: #2b4438;
    font-size: 26.923rpx;
    font-weight: 500;
    line-height: 40.385rpx;
  }

  .summary-guidance,
  .summary-message {
    display: block;
    margin-top: 30.769rpx;
    color: #586c5b;
    font-size: 25rpx;
    line-height: 47.5rpx;
  }
}
</style>
