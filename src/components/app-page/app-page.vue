<script setup lang="ts">
import { computed } from 'vue'

import { backTo } from '@/services/navigation'
const props = withDefaults(
  defineProps<{
    title: string
    back?: boolean
    footer?: boolean
    fallback?: string
    customBack?: boolean
  }>(),
  { back: false, footer: false, fallback: undefined, customBack: false }
)
const emit = defineEmits<{ back: [] }>()
const info = typeof uni.getWindowInfo === 'function' ? uni.getWindowInfo() : uni.getSystemInfoSync()
let top = 32,
  right = 0,
  nav = 56
// #ifdef MP-WEIXIN
const capsule = uni.getMenuButtonBoundingClientRect()
top = info.statusBarHeight || 20
right = info.windowWidth - capsule.left + 8
nav = Math.max(44, capsule.bottom - top + 8)
// #endif
const headingStyle = computed(() => ({
  paddingTop: `${top}px`,
  paddingRight: `${right}px`,
  minHeight: `${top + nav}px`
}))
/** 二级页面默认返回实际来源，编辑页可接管未保存确认 */
const goBack = () => {
  if (props.customBack) emit('back')
  else backTo(props.fallback)
}
</script>
<template>
  <view
    class="app-page"
    :class="{ 'has-footer': footer }"
    :style="{ '--page-header-height': `${top + nav}px` }"
    ><view class="page-nav" :style="headingStyle"
      ><button v-if="back" class="back-button" aria-label="返回" @click="goBack">
        <text>‹</text></button
      ><view v-if="title === '句芽英语'" class="nav-brand"
        ><image
          class="nav-wordmark"
          src="/static/brand/juya-nav@3x.png"
          mode="aspectFit"
          aria-label="juya"
        /><text>句芽英语</text></view
      ><text v-else class="nav-title">{{ title }}</text
      ><view class="nav-action"><slot name="action" /></view></view
    ><view class="page-body"><slot /></view><slot name="footer"
  /></view>
</template>
<style scoped lang="scss">
.app-page {
  min-height: 100vh;
  background: #fffcf5;

  &.has-footer {
    padding-bottom: calc(160rpx + env(safe-area-inset-bottom));
  }
}

.page-nav {
  display: flex;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 15;
  background: #fffcf5;
  border-bottom: 0;
  padding-left: 46.15rpx;
  padding-bottom: 0;

  .nav-brand {
    display: flex;
    align-items: center;
    gap: 21.15rpx;
    font-size: 26.92rpx;
    font-weight: 500;

    .nav-wordmark {
      width: 106.67rpx;
      height: 101.92rpx;
    }
  }

  .nav-title {
    font-size: 30rpx;
    font-weight: 600;
  }

  .back-button {
    border: 0;
    background: none;
    width: 56rpx;
    height: 80rpx;
    padding: 0;
    margin-left: -16rpx;
    margin-right: 8rpx;

    text {
      font-size: 54rpx;
      font-weight: 300;
    }
  }

  .nav-action {
    margin-left: auto;
    padding-right: 30rpx;
  }
}

.page-body {
  padding: 46.15rpx 46.15rpx 53.85rpx;
}
</style>
