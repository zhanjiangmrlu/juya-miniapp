<script setup lang="ts">
import type { LimitedEntitlementViewModel } from '@/shared/types/entitlements'
import type {
  EntitlementCardEmits,
  EntitlementCardProps
} from '@/shared/types/entitlements-components'

defineProps<EntitlementCardProps>()

const emit = defineEmits<EntitlementCardEmits>()

/** 打开权益对应的状态页，不在卡片内改变服务端状态。 */
function handleOpen(item: LimitedEntitlementViewModel) {
  emit('open', item)
}
</script>

<template>
  <button class="entitlement-card" @click="handleOpen(item)">
    <view>
      <text class="entitlement-card__state">{{ item.state }}</text>
      <text class="entitlement-card__title">{{ item.title }}</text>
      <text class="entitlement-card__meta">
        {{ item.durationDays }} 天 · {{ item.sceneCount }} 个场景
      </text>
    </view>
    <text class="entitlement-card__action">查看</text>
  </button>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.entitlement-card {
  display: flex;
  width: 100%;
  min-height: 144rpx;
  align-items: center;
  justify-content: space-between;
  margin: 0;
  padding: 28rpx;
  border: 2rpx solid tokens.$color-border;
  border-radius: tokens.$radius-large;
  background: rgb(255 255 255 / 76%);
  color: tokens.$color-text;
  text-align: left;

  &__state,
  &__title,
  &__meta {
    display: block;
  }

  &__state {
    color: tokens.$color-primary;
    font-size: 21rpx;
    font-weight: 700;
  }

  &__title {
    margin-top: 8rpx;
    font-size: 30rpx;
    font-weight: 700;
  }

  &__meta {
    margin-top: 8rpx;
    color: tokens.$color-text-muted;
    font-size: 22rpx;
  }

  &__action {
    color: tokens.$color-primary-strong;
    font-size: 23rpx;
  }
}
</style>
