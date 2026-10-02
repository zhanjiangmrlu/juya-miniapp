<script setup lang="ts">
defineProps<{ count: number | null }>()
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
  min-height: 64px;
  margin-top: 15px;
  padding: 10px 16px 8px;
  border-radius: 16px;
  background: tokens.$home-module;

  .summary-label,
  .scene-count {
    display: block;
  }

  .summary-label {
    font-size: 12px;
    font-weight: 500;
    line-height: 20px;
  }

  .scene-count {
    margin-top: 1px;
    font-size: 15px;
    font-weight: 700;
    line-height: 25px;
  }

  @media (width <= 375px) {
    margin-top: 12px;
  }
}
</style>
