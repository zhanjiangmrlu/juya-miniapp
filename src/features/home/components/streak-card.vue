<script setup lang="ts">
import type { CheckinSummary } from '@/shared/contracts/home'

defineProps<{ checkins: CheckinSummary | null }>()
</script>

<template>
  <view class="streak-card">
    <view class="streak-summary">
      <text class="streak-label">连续学习</text>
      <text class="streak-days">{{ checkins?.current_streak ?? '—' }} 天</text>
    </view>
    <text class="encouragement">保持热爱，遇见更好的自己</text>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.streak-card {
  display: flex;
  min-height: 82px;
  align-items: flex-end;
  margin-top: 12px;
  padding: 14px 18px 10px;
  border-radius: 16px;
  background: tokens.$home-streak;
  gap: 12px;

  .streak-summary {
    min-width: 113px;
    flex-shrink: 0;
  }

  .streak-label,
  .streak-days {
    display: block;
  }

  .streak-label {
    font-size: 13px;
    font-weight: 500;
    line-height: 22px;
  }

  .streak-days {
    font-size: 26px;
    font-weight: 700;
    line-height: 36px;
  }

  .encouragement {
    padding-bottom: 3px;
    color: tokens.$home-muted;
    font-size: 11px;
    line-height: 22px;
  }
}
</style>
