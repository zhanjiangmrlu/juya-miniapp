<script setup lang="ts">
defineProps<{
  eyebrow: string
  title: string
}>()
</script>

<template>
  <view class="learning-heading">
    <view>
      <text class="learning-heading__eyebrow">{{ eyebrow }}</text>
      <text class="learning-heading__title">{{ title }}</text>
    </view>
    <view class="learning-heading__mark" aria-hidden="true"><view /></view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.learning-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;

  &__eyebrow,
  &__title {
    display: block;
  }

  &__eyebrow {
    color: tokens.$color-primary-strong;
    font-size: 23rpx;
    font-weight: 650;
  }

  &__title {
    margin-top: 6rpx;
    font-family: Georgia, 'Noto Serif SC', serif;
    font-size: 48rpx;
    font-weight: 700;
  }

  &__mark {
    display: grid;
    width: 76rpx;
    height: 76rpx;
    place-items: center;
    border-radius: 50%;
    background: rgb(255 255 255 / 78%);

    view {
      width: 20rpx;
      height: 20rpx;
      border: 4rpx solid tokens.$color-primary;
      transform: rotate(45deg);
    }
  }
}
</style>
