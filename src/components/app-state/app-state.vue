<script setup lang="ts">
defineProps<{
  description: string
  iconLabel: string
  title: string
}>()
</script>

<template>
  <view class="app-state" role="status">
    <view class="app-state__icon" role="img" :aria-label="iconLabel">
      <slot name="icon">
        <view class="app-state__icon-mark" />
      </slot>
    </view>
    <text class="app-state__title">{{ title }}</text>
    <text class="app-state__description">{{ description }}</text>
    <view v-if="$slots.default" class="app-state__actions">
      <slot />
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/mixins.scss' as mixins;
@use '@/styles/tokens.scss' as tokens;

.app-state {
  display: flex;
  align-items: center;
  padding: 64rpx 40rpx;
  flex-direction: column;
  text-align: center;

  &__icon {
    display: grid;
    width: 88rpx;
    height: 88rpx;
    place-items: center;
    border-radius: 50%;
    background: tokens.$color-module;
  }

  &__icon-mark {
    width: 24rpx;
    height: 24rpx;
    border: 6rpx solid tokens.$color-primary;
    border-radius: 50%;
  }

  &__title {
    margin-top: tokens.$space-4;
    color: tokens.$color-text;
    font-size: 36rpx;
    font-weight: 700;
  }

  &__description {
    @include mixins.text-wrap;

    max-width: 560rpx;
    margin-top: tokens.$space-2;
    color: tokens.$color-text-muted;
    font-size: 28rpx;
    line-height: 1.7;
  }

  &__actions {
    width: 100%;
    margin-top: tokens.$space-5;
  }
}
</style>
