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
  color: tokens.$home-ink;
  display: flex;
  min-height: tokens.home-size(82);
  align-items: flex-end;
  margin-top: tokens.home-size(12);
  padding: tokens.home-size(14) tokens.home-size(18) tokens.home-size(10);
  border-radius: tokens.home-size(16);
  background: tokens.$home-streak;
  gap: tokens.home-size(12);

  .streak-summary {
    min-width: tokens.home-size(113);
    flex-shrink: 0;
  }

  .streak-label,
  .streak-days {
    display: block;
  }

  .streak-label {
    @include tokens.home-glyph;

    font-size: tokens.home-size(13);
    font-weight: 500;
    line-height: tokens.home-size(22);
  }

  .streak-days {
    @include tokens.home-glyph(3);

    font-size: tokens.home-size(26);
    font-weight: 700;
    line-height: tokens.home-size(36);
  }

  .encouragement {
    @include tokens.home-glyph;

    padding-bottom: tokens.home-size(3);
    color: tokens.$home-muted;
    font-size: tokens.home-size(11);
    line-height: tokens.home-size(22);
  }
}
</style>
