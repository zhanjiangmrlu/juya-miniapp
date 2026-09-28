<script setup lang="ts">
withDefaults(
  defineProps<{
    backLabel?: string
    centered?: boolean
    eyebrow?: string
    showBack?: boolean
    title: string
  }>(),
  {
    backLabel: '返回',
    centered: true,
    eyebrow: undefined,
    showBack: true
  }
)

/** 返回上一页；没有可返回页面时回到首页，避免用户停留在空白入口。 */
function goBack() {
  uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/home/index' }) })
}
</script>

<template>
  <view class="page-header">
    <button v-if="showBack" class="page-header__back" :aria-label="backLabel" @click="goBack">
      <view class="page-header__chevron" aria-hidden="true" />
    </button>
    <view
      v-else
      class="page-header__back-placeholder"
      :class="{ 'page-header__back-placeholder--hidden': !centered }"
      aria-hidden="true"
    />
    <view class="page-header__content" :class="{ 'page-header__content--leading': !centered }">
      <text v-if="eyebrow" class="page-header__eyebrow">{{ eyebrow }}</text>
      <text class="page-header__title">{{ title }}</text>
    </view>
    <view class="page-header__aside" :class="{ 'page-header__aside--leading': !centered }">
      <slot name="aside" />
    </view>
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

    &--leading {
      grid-column: 1 / 3;
      text-align: left;
    }
  }

  &__eyebrow {
    display: block;
    color: tokens.$color-text-muted;
    font-size: 22rpx;
  }

  &__title {
    display: block;
    color: tokens.$color-text;
    font-family: Georgia, 'Noto Serif SC', serif;
    font-size: 38rpx;
    font-weight: 700;
    line-height: 1.25;
    overflow-wrap: anywhere;
    white-space: normal;
  }

  &__aside {
    display: flex;
    justify-content: flex-end;

    &--leading {
      grid-column: 3;
    }
  }

  &__back-placeholder {
    &--hidden {
      display: none;
    }
  }
}
</style>
