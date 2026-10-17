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
let top = 0,
  right = 0,
  nav = 44
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
  <view class="app-page" :class="{ 'has-footer': footer }"
    ><view class="page-nav" :style="headingStyle"
      ><button v-if="back" class="back-button" aria-label="返回" @click="goBack">
        <text>‹</text></button
      ><text class="nav-title">{{ title }}</text
      ><view class="nav-action"><slot name="action" /></view></view
    ><view class="page-body"><slot /></view><slot name="footer"
  /></view>
</template>
<style scoped lang="scss">
.app-page {
  min-height: 100vh;
  background: #fffdf7;

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
  background: #fffdf7;
  border-bottom: 1px solid #e5e9de;
  padding-left: 40rpx;
  padding-bottom: 0;

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
  padding: 40rpx;
}
</style>
