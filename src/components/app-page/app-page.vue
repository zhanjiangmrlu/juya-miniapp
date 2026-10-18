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
        <image src="/static/design/back.svg" mode="aspectFit" aria-hidden="true" /></button
      ><view v-if="title === '句芽英语'" class="nav-brand"
        ><text class="nav-wordmark">juya</text><text>句芽英语</text></view
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
    padding-bottom: calc(190rpx + env(safe-area-inset-bottom));
  }
}

.page-nav {
  position: sticky;
  top: 0;
  z-index: 15;
  display: flex;
  align-items: center;
  padding-left: 46.154rpx;
  background: #fffcf5;

  .nav-brand {
    display: flex;
    align-items: center;
    gap: 21.154rpx;
    font-size: 26.923rpx;
    font-weight: 500;
    line-height: 41.731rpx;
  }

  .nav-wordmark {
    font-family: Fraunces, Georgia, serif;
    font-size: 51.923rpx;
    font-style: italic;
    font-weight: 400;
    line-height: 84.615rpx;
    letter-spacing: -0.035em;
  }

  .nav-title {
    font-size: 28.846rpx;
    font-weight: 500;
    line-height: 44.712rpx;
  }

  .back-button {
    width: 50rpx;
    height: 76.923rpx;
    margin-right: 15.385rpx;
    padding: 0;
    border: 0;
    background: none;

    image {
      width: 42.308rpx;
      height: 42.308rpx;
    }
  }

  .nav-action {
    margin-left: auto;
    padding-right: 30.769rpx;
  }
}

.page-body {
  padding: 46.154rpx 46.154rpx 53.846rpx;
}
</style>
