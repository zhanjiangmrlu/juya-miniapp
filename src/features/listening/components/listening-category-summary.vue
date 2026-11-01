<script setup lang="ts">
import { computed } from 'vue'

import type { ListeningCategorySummaryProps } from '@/shared/types/listening-components'
const props = defineProps<ListeningCategorySummaryProps>()
const progress = computed(() =>
  props.category.total_articles
    ? Math.min(100, (props.category.completed_articles / props.category.total_articles) * 100)
    : 0
)
</script>
<template>
  <view class="category-summary">
    <text class="category-name">{{ category.name_en || category.name }}</text>
    <text v-if="category.name_en" class="category-chinese">{{ category.name }}</text>
    <view class="category-counts"
      ><text>{{ category.total_articles }}篇短文 · 已学{{ category.completed_articles }}篇</text
      ><text v-if="category.restricted_articles"
        >{{ category.restricted_articles }}篇需学习授权</text
      ><text v-else>当前篇目可学习</text></view
    >
    <view class="category-progress"
      ><view class="progress-fill" :style="{ width: `${progress}%` }"
    /></view>
  </view>
</template>
<style scoped lang="scss">
.category-summary {
  padding: 18rpx 0 26rpx;

  .category-name {
    display: block;
    font-family: var(--app-serif-font, Georgia, serif);
    font-size: 38rpx;
    line-height: 1.5;
  }

  .category-chinese {
    display: block;
    margin-top: 8rpx;
    font-size: 26rpx;
  }

  .category-counts {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 12rpx;
    margin-top: 20rpx;
    font-size: 22rpx;
    color: #586c5b;
  }

  .category-progress {
    margin-top: 20rpx;
    height: 8rpx;
    overflow: hidden;
    background: #e8ecdf;
    border-radius: 4rpx;
  }

  .progress-fill {
    height: 100%;
    background: #72966a;
  }
}
</style>
