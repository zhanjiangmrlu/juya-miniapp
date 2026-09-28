<script setup lang="ts">
const emit = defineEmits<{
  account: []
  entitlements: []
  feedback: []
}>()

/** 将菜单点击转换为语义事件，由档案页统一负责路由。 */
function select(action: 'account' | 'entitlements' | 'feedback') {
  if (action === 'account') emit('account')
  else if (action === 'entitlements') emit('entitlements')
  else emit('feedback')
}
</script>

<template>
  <view class="profile-actions">
    <button class="profile-actions__row" @click="select('entitlements')">
      <view>
        <text class="profile-actions__title">我的学习权益</text>
        <text class="profile-actions__description">正式内容包与限时学习状态</text>
      </view>
      <text class="profile-actions__arrow">›</text>
    </button>
    <button class="profile-actions__row" @click="select('feedback')">
      <view>
        <text class="profile-actions__title">我的反馈</text>
        <text class="profile-actions__description">查看处理进展和站内回复</text>
      </view>
      <text class="profile-actions__arrow">›</text>
    </button>
    <button class="profile-actions__row" @click="select('account')">
      <view>
        <text class="profile-actions__title">数据与账号</text>
        <text class="profile-actions__description">清空学习数据、注销账号</text>
      </view>
      <text class="profile-actions__arrow">›</text>
    </button>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.profile-actions {
  overflow: hidden;
  margin-top: 22rpx;
  border: 2rpx solid tokens.$color-border;
  border-radius: tokens.$radius-large;
  background: rgb(255 255 255 / 76%);

  &__row {
    display: flex;
    width: 100%;
    min-height: 112rpx;
    align-items: center;
    justify-content: space-between;
    margin: 0;
    padding: 22rpx 28rpx;
    border: 0;
    border-bottom: 2rpx solid rgb(201 222 209 / 60%);
    border-radius: 0;
    background: transparent;
    color: tokens.$color-text;
    text-align: left;

    &:last-child {
      border-bottom: 0;
    }
  }

  &__title,
  &__description {
    display: block;
  }

  &__title {
    font-size: 27rpx;
    font-weight: 700;
  }

  &__description {
    margin-top: 6rpx;
    color: tokens.$color-text-muted;
    font-size: 21rpx;
  }

  &__arrow {
    color: tokens.$color-primary;
    font-size: 40rpx;
  }
}
</style>
