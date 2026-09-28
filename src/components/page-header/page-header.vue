<script setup lang="ts">
withDefaults(
  defineProps<{
    backLabel?: string
    eyebrow?: string
    showBack?: boolean
    title: string
  }>(),
  {
    backLabel: '返回',
    eyebrow: undefined,
    showBack: true
  }
)

function goBack() {
  uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/home/index' }) })
}
</script>

<template>
  <view class="page-header">
    <button v-if="showBack" class="page-header__back" :aria-label="backLabel" @click="goBack">
      <view class="page-header__chevron" aria-hidden="true" />
    </button>
    <view class="page-header__content">
      <text v-if="eyebrow" class="page-header__eyebrow">{{ eyebrow }}</text>
      <text class="page-header__title">{{ title }}</text>
    </view>
    <view class="page-header__aside"><slot name="aside" /></view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.page-header {
  display: grid;
  min-height: 108rpx;
  align-items: center;
  grid-template-columns: 72rpx 1fr 72rpx;
  padding-top: 16rpx;

  &__back {
    display: grid;
    width: 72rpx;
    height: 72rpx;
    place-items: center;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: rgb(255 255 255 / 78%);
    box-shadow: 0 8rpx 24rpx rgb(23 63 51 / 9%);
  }

  &__chevron {
    width: 18rpx;
    height: 18rpx;
    border-bottom: 4rpx solid tokens.$color-primary;
    border-left: 4rpx solid tokens.$color-primary;
    transform: rotate(45deg);
  }

  &__content {
    min-width: 0;
    text-align: center;
  }

  &__eyebrow {
    display: block;
    color: tokens.$color-text-muted;
    font-size: 22rpx;
  }

  &__title {
    display: block;
    overflow: hidden;
    color: tokens.$color-text;
    font-family: Georgia, 'Noto Serif SC', serif;
    font-size: 38rpx;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__aside {
    display: flex;
    justify-content: flex-end;
  }
}
</style>
