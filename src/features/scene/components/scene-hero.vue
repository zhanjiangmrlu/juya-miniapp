<script setup lang="ts">
defineProps<{
  chineseTitle: string
  imageUrl?: string
  series: string
  title: string
}>()
</script>

<template>
  <view class="scene-hero">
    <text class="scene-hero__series">{{ series }}</text>
    <text class="scene-hero__title">{{ title }}</text>
    <text class="scene-hero__chinese">{{ chineseTitle }}</text>
    <image v-if="imageUrl" class="scene-hero__image" :src="imageUrl" mode="aspectFill" />
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.scene-hero {
  overflow: hidden;
  border-radius: tokens.$radius-large;
  background: rgb(255 255 255 / 76%);
  text-align: center;

  &__series,
  &__title,
  &__chinese {
    display: block;
  }

  &__series {
    padding-top: 18rpx;
    color: tokens.$color-primary-strong;
    font-size: 22rpx;
    font-weight: 650;
  }

  &__title {
    margin-top: 8rpx;
    font-family: Georgia, 'Noto Serif SC', serif;
    font-size: 42rpx;
    font-weight: 700;
  }

  &__chinese {
    margin: 8rpx 0 18rpx;
    font-size: 26rpx;
  }

  &__image {
    display: block;
    width: 100%;
    height: 260rpx;
  }
}
</style>
