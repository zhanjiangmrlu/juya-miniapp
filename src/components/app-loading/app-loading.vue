<script setup lang="ts">
withDefaults(
  defineProps<{ label?: string; compact?: boolean; iconOnly?: boolean; stacked?: boolean }>(),
  {
    label: '正在加载',
    compact: false,
    iconOnly: false,
    stacked: false
  }
)
</script>
<template>
  <view
    class="app-loading"
    :class="{ compact, stacked }"
    role="status"
    aria-live="polite"
    :aria-label="label"
  >
    <view class="loading-icon" aria-hidden="true" /><text v-if="!iconOnly">{{ label }}</text>
  </view>
</template>
<style scoped lang="scss">
.app-loading {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 13.462rpx;
  color: inherit;
  font-size: inherit;
  line-height: 1.8;

  .loading-icon {
    width: 30.769rpx;
    height: 30.769rpx;
    flex-shrink: 0;
    border: 3.846rpx solid currentcolor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: loading-turn 0.9s linear infinite;
  }

  &.compact .loading-icon {
    width: 23.077rpx;
    height: 23.077rpx;
    border-width: 2.885rpx;
  }

  &.stacked {
    flex-direction: column;
    gap: 9.615rpx;
  }
}

@keyframes loading-turn {
  to {
    transform: rotate(360deg);
  }
}
</style>
