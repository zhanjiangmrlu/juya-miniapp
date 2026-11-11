<script setup lang="ts">
import { openLogin } from '@/services/navigation'
import { Routes } from '@/shared/constants/navigation'

defineProps<{
  title: string
  description: string
  target: string
  icon: string
  showPrivacy?: boolean
}>()
/** 游客无需登录打开公开设置 */
const openSettings = () => uni.navigateTo({ url: `${Routes.SETTINGS}?source=profile` })
/** 游客说明页主动返回免费内容入口 */
const browse = () => uni.switchTab({ url: Routes.HOME })
</script>
<template>
  <view class="guest-state">
    <image class="guest-icon" :src="icon" mode="aspectFit" aria-hidden="true" /><text
      class="title"
      >{{ title }}</text
    >
    <text class="description">{{ description }}</text>
    <button class="primary" @click="openLogin(target)">登录</button>
    <button class="secondary" @click="browse">继续浏览免费内容</button>
    <button v-if="showPrivacy" class="text-button privacy-link" @click="openSettings">设置</button>
  </view>
</template>
<style scoped lang="scss">
.guest-state {
  flex: 1;
  padding: 94.231rpx 9.615rpx 67.308rpx;
  text-align: center;

  .guest-icon {
    display: block;
    width: 92.308rpx;
    height: 92.308rpx;
    margin: 0 auto 34.615rpx;
  }

  .title,
  .description {
    display: block;
  }

  .title {
    font-size: 38.462rpx;
    font-weight: 700;
    line-height: 57.692rpx;
  }

  .description {
    margin: 23.077rpx 0 42.308rpx;
    color: #586c5b;
    font-size: 25rpx;
    line-height: 47.5rpx;
  }

  .primary,
  .secondary {
    width: 100%;
    min-height: 84.615rpx;
    padding: 0;
    border-radius: 17.308rpx;
    font-size: 25rpx;
    line-height: 82.615rpx;
  }

  .primary {
    background: #c8e2b5;
    border-color: #c8e2b5;
    font-weight: 700;
  }

  .secondary {
    margin-top: 23.077rpx;
    border: 1px solid #dfe5d8;
    background: #fffcf5;
    font-weight: 400;
  }

  .privacy-link {
    display: flex;
    align-items: center;
    width: 100%;
    margin-top: 138.462rpx;
    padding: 26.923rpx 0 0;
    border-top: 1px solid #dfe5d8;
    border-radius: 0;
    text-align: left;
  }
}
</style>
