<script setup lang="ts">
import { useModalScrollLock } from '@/shared/use-page-scroll-lock'

withDefaults(
  defineProps<{
    imageUrl: string
    title?: string
    subtitle?: string
    caption?: string
    dialogLabel?: string
    closeLabel?: string
  }>(),
  { title: '', subtitle: '', caption: '', dialogLabel: '图片预览', closeLabel: '关闭图片' }
)
const emit = defineEmits<{ close: []; error: [] }>()

useModalScrollLock()

let closeTop = 39
let closeRight = 19
// #ifdef MP-WEIXIN
// 微信胶囊是原生层控件，关闭按钮放在其左侧并与胶囊中心对齐
closeRight = 122
try {
  const info = uni.getWindowInfo()
  const capsule = uni.getMenuButtonBoundingClientRect()
  closeTop = Math.max(39, info.statusBarHeight + 8)
  if (capsule.width > 0 && capsule.height > 0 && capsule.left > 0) {
    closeTop = Math.max(info.statusBarHeight, capsule.top + (capsule.height - 42) / 2)
    closeRight = info.windowWidth - capsule.left + 12
  }
} catch {
  // 缺少窗口信息时预留参考胶囊宽度
}
// #endif
</script>
<template>
  <view
    class="app-image-viewer"
    :style="{
      '--viewer-close-top': `${closeTop}px`,
      '--viewer-close-right': `${closeRight}px`
    }"
    role="dialog"
    aria-modal="true"
    :aria-label="dialogLabel"
    @touchmove.stop.prevent
    @wheel.stop.prevent
  >
    <button class="viewer-close" :aria-label="closeLabel" @click="emit('close')">×</button>
    <view v-if="title || subtitle" class="viewer-heading"
      ><text v-if="title" class="viewer-title">{{ title }}</text
      ><text v-if="subtitle" class="viewer-subtitle">{{ subtitle }}</text></view
    >
    <view class="viewer-image"
      ><image class="original-image" :src="imageUrl" mode="aspectFit" @error="emit('error')" /><text
        v-if="caption"
        class="viewer-caption"
        >{{ caption }}</text
      ></view
    >
  </view>
</template>
<style scoped lang="scss">
.app-image-viewer {
  position: fixed;
  z-index: 80;
  overflow-y: auto;
  background: #1a2a21;
  color: #fff;
  inset: 0;

  .viewer-close {
    position: absolute;
    top: var(--viewer-close-top);
    right: var(--viewer-close-right);
    width: 42px;
    height: 42px;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: #fff;
    font-size: 31px;
    line-height: 42px;

    &::after {
      border: 0;
    }
  }

  .viewer-heading {
    margin: 95px 30px 0 20px;
    font-size: 21px;
    font-weight: 700;
    line-height: normal;

    .viewer-title,
    .viewer-subtitle {
      display: block;
    }

    .viewer-title {
      min-height: 37px;
    }
  }

  .viewer-subtitle {
    min-height: 27px;
    color: #d7e1d7;
    font-size: 13px;
    font-weight: 400;
    line-height: normal;
  }

  .viewer-image {
    width: 100%;
    max-width: 700px;
    margin: clamp(24px, calc(30.7vh - 159px), 100px) auto calc(30px + env(safe-area-inset-bottom));

    .viewer-caption {
      display: block;
      min-height: 45px;
      margin: 20px 20px 0;
      color: #d7e1d7;
      font-size: 12px;
      line-height: normal;
      text-align: center;
    }
  }

  .original-image {
    display: block;
    width: 100%;
    height: 71.54vw;
    max-height: min(500px, calc(100vh - 330px - env(safe-area-inset-bottom)));
    border-radius: 12px;
  }
}
</style>
