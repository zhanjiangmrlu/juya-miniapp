<script setup lang="ts">
defineProps<{
  face: 'BACK' | 'FRONT'
  label: string
  position: string
}>()

const emit = defineEmits<{
  flip: []
  play: []
}>()

/** 用户点击卡面时翻面。 */
function handleFlip() {
  emit('flip')
}

/** 播放操作独立上抛，避免冒泡触发翻面。 */
function handlePlay() {
  emit('play')
}
</script>

<template>
  <view class="review-card">
    <text class="review-card__position">{{ position }}</text>
    <button class="review-card__surface" @click="handleFlip">
      <text class="review-card__face">{{ face === 'FRONT' ? '正面' : '背面' }}</text>
      <text class="review-card__word">{{ label }}</text>
      <text class="review-card__hint">
        {{ face === 'FRONT' ? '先回忆含义，再点击查看' : '结合来源句巩固记忆' }}
      </text>
    </button>
    <button class="review-card__audio" @click.stop="handlePlay">播放音频</button>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.review-card {
  margin-top: 28rpx;

  &__position {
    display: block;
    color: tokens.$color-text-muted;
    font-size: 22rpx;
    text-align: center;
  }

  &__surface {
    display: flex;
    width: 100%;
    min-height: 520rpx;
    align-items: center;
    justify-content: center;
    margin: 18rpx 0 0;
    padding: 48rpx;
    border: 2rpx solid tokens.$color-border;
    border-radius: 48rpx;
    background: rgb(255 255 255 / 82%);
    color: tokens.$color-text;
    flex-direction: column;
  }

  &__face,
  &__word,
  &__hint {
    display: block;
  }

  &__face {
    color: tokens.$color-primary;
    font-size: 22rpx;
    font-weight: 700;
  }

  &__word {
    margin-top: 48rpx;
    font-family: Georgia, serif;
    font-size: 56rpx;
    font-weight: 700;
  }

  &__hint {
    margin-top: 32rpx;
    color: tokens.$color-text-muted;
    font-size: 24rpx;
  }

  &__audio {
    width: 100%;
    min-height: 84rpx;
    margin-top: 20rpx;
    border: 2rpx solid tokens.$color-border;
    border-radius: tokens.$radius-medium;
    background: tokens.$color-white;
    color: tokens.$color-primary-strong;
    font-size: 27rpx;
    font-weight: 700;
  }
}
</style>
