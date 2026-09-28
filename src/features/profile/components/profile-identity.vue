<script setup lang="ts">
defineProps<{
  juyaId: string
  wechatLabel: string
}>()

const emit = defineEmits<{
  contact: []
}>()

/** 打开统一联系资料管理流程。 */
function handleContact() {
  emit('contact')
}
</script>

<template>
  <view class="profile-identity">
    <view class="profile-identity__row">
      <text class="profile-identity__label">句芽号</text>
      <text class="profile-identity__value">{{ juyaId }}</text>
    </view>
    <button class="profile-identity__row profile-identity__row--button" @click="handleContact">
      <text class="profile-identity__label">微信号</text>
      <text class="profile-identity__value">{{ wechatLabel }}</text>
    </button>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.profile-identity {
  overflow: hidden;
  margin-top: 28rpx;
  border: 2rpx solid tokens.$color-border;
  border-radius: tokens.$radius-large;
  background: rgb(255 255 255 / 76%);

  &__row {
    display: flex;
    min-height: 104rpx;
    align-items: center;
    justify-content: space-between;
    padding: 24rpx 28rpx;
    border-bottom: 2rpx solid rgb(201 222 209 / 60%);

    &:last-child {
      border-bottom: 0;
    }

    &--button {
      width: 100%;
      margin: 0;
      border: 0;
      border-radius: 0;
      background: transparent;
      color: tokens.$color-text;
    }
  }

  &__label {
    color: tokens.$color-text-muted;
    font-size: 24rpx;
  }

  &__value {
    font-size: 26rpx;
    font-weight: 700;
  }
}
</style>
