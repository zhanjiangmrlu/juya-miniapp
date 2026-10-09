<script setup lang="ts">
import type { OpenSceneSummaryProps } from '@/shared/types/home-components'

defineProps<OpenSceneSummaryProps>()
</script>

<template>
  <view class="open-scene-summary">
    <text class="summary-label">开放场景进度</text>
    <text class="scene-count">{{
      count === null ? '连接后查看开放场景' : `${count} 个场景可随时复习`
    }}</text>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.open-scene-summary {
  color: tokens.$home-ink;
  min-height: tokens.home-size(64);
  margin-top: tokens.home-size(15);
  padding: tokens.home-size(10) tokens.home-size(16) tokens.home-size(8);
  border-radius: tokens.home-size(16);
  background: tokens.$home-module;

  .summary-label,
  .scene-count {
    display: block;
  }

  .summary-label {
    @include tokens.home-glyph;

    font-size: tokens.home-size(12);
    font-weight: 500;
    line-height: tokens.home-size(20);
  }

  .scene-count {
    @include tokens.home-glyph;

    margin-top: tokens.home-size(1);
    font-size: tokens.home-size(15);
    font-weight: 700;
    line-height: tokens.home-size(25);
  }
}
</style>
