<script setup lang="ts">
withDefaults(defineProps<{ showProfileAction?: boolean }>(), {
  showProfileAction: false
})

const emit = defineEmits<{
  close: []
  profile: []
}>()

/** 关闭提示并停留在当前学习页面。 */
function handleClose() {
  emit('close')
}

/** 请求前往资料页，是否展示该入口由服务端开关映射后的属性控制。 */
function handleProfile() {
  emit('profile')
}
</script>

<template>
  <view class="access-notice" role="dialog" aria-modal="true" aria-label="内容访问提示">
    <view class="access-notice__panel">
      <view class="access-notice__handle" aria-hidden="true" />
      <text class="access-notice__badge">只读预览</text>
      <text class="access-notice__title">当前账号暂未开通此内容</text>
      <text class="access-notice__description">你仍可以继续学习已经开放的场景。</text>
      <button class="access-notice__primary" @click="handleClose">知道了</button>
      <button v-if="showProfileAction" class="access-notice__secondary" @click="handleProfile">
        完善账号资料
      </button>
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.access-notice {
  position: fixed;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(34 55 46 / 48%);
  inset: 0;
  padding: tokens.$space-5;

  &__panel {
    width: 100%;
    max-width: 600rpx;
    padding: 16rpx 40rpx 40rpx;
    border-radius: 48rpx;
    background: #fff8e9;
  }

  &__handle {
    width: 80rpx;
    height: 8rpx;
    margin: 0 auto 30rpx;
    border-radius: tokens.$radius-pill;
    background: #d8d4c8;
  }

  &__badge {
    display: inline-block;
    padding: 9rpx 16rpx;
    border-radius: tokens.$radius-pill;
    background: #e3effb;
    color: #376d9b;
    font-size: 22rpx;
  }

  &__title,
  &__description {
    display: block;
  }

  &__title {
    margin-top: 26rpx;
    font-family: Georgia, 'Noto Serif SC', serif;
    font-size: 38rpx;
    font-weight: 700;
  }

  &__description {
    margin-top: 24rpx;
    font-size: 28rpx;
    line-height: 1.6;
  }

  &__primary,
  &__secondary {
    width: 100%;
    min-height: 88rpx;
    margin: 28rpx 0 0;
    border-radius: tokens.$radius-medium;
    font-size: 30rpx;
    font-weight: 700;
  }

  &__primary {
    background: tokens.$color-primary;
    color: tokens.$color-white;
  }

  &__secondary {
    margin-top: tokens.$space-2;
    border: 2rpx solid tokens.$color-border;
    background: tokens.$color-white;
    color: tokens.$color-primary-strong;
  }
}
</style>
