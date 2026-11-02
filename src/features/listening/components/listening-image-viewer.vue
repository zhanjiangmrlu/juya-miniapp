<script setup lang="ts">
import { getCurrentInstance, nextTick, onUnmounted, ref } from 'vue'

import AppState from '@/components/app-state/app-state.vue'

import type { ListeningImageViewerProps } from '@/shared/types/listening-components'
defineProps<ListeningImageViewerProps>()
defineEmits<{ close: []; retry: []; error: [] }>()
const instance = getCurrentInstance(),
  scale = ref(1),
  commandScale = ref(1)
let generation = 0
onUnmounted(() => {
  generation++
})
/** 同步原生双指缩放，确保后续按钮从实际倍率继续
 * @param event 原生图片缩放事件及当前倍率
 */
const scaled = (event: { detail: { scale: number } }) => {
  if (Number.isFinite(event.detail.scale))
    scale.value = Math.max(1, Math.min(5, event.detail.scale))
}
/** 先同步实际倍率，再等待原生视图完成后下发目标，避免同值复位被合并
 * @param targetScale 本次请求的目标倍率
 */
const transform = async (targetScale: number) => {
  const run = ++generation
  commandScale.value = scale.value
  scale.value = targetScale
  if (instance?.proxy) await instance.proxy.$nextTick()
  else await nextTick()
  // #ifdef H5
  // H5 的 movable-view 在下一帧应用倍率，等待其完成后再下发目标
  if (typeof requestAnimationFrame === 'function')
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  // #endif
  if (run !== generation) return
  commandScale.value = targetScale
}
/** 只改变倍率，拖动位置交给原生视图保留，不重发不同平台口径的旧坐标
 * @param delta 用户按钮请求的倍率增量
 */
const zoom = (delta: number) => transform(Math.max(1, Math.min(5, scale.value + delta)))
/** 恢复适屏倍率，原生边界约束同时将占满容器的视图归回原点 */
const fit = () => transform(1)
</script>
<template>
  <view class="image-veil" role="dialog" aria-modal="true" aria-label="本篇原图">
    <view class="image-header"
      ><button class="image-close" aria-label="返回文章" @click="$emit('close')">
        <image class="back-icon" src="/static/design/back.svg" mode="aspectFit" /></button
      ><text class="image-title">本篇原图</text></view
    >
    <view class="image-container"
      ><AppState v-if="error" :error="error" centered-error @retry="$emit('retry')" />
      <movable-area v-else class="image-area" scale-area
        ><movable-view
          class="image-pan"
          direction="all"
          scale
          :scale-min="1"
          :scale-max="5"
          :scale-value="commandScale"
          :animation="false"
          :inertia="false"
          :x="0"
          :y="0"
          @scale="scaled"
          ><image
            :src="image"
            mode="aspectFit"
            class="original-image"
            @error="$emit('error')" /></movable-view
      ></movable-area>
      <view class="image-tools"
        ><button
          class="zoom-button"
          data-action="zoom-out"
          aria-label="缩小图片"
          :disabled="scale <= 1"
          @click="zoom(-0.5)"
        >
          <image class="zoom-icon" src="/static/listening/r17-minus.svg" mode="aspectFit" /></button
        ><button class="fit-button" data-action="fit" @click="fit">适应屏幕</button
        ><button
          class="zoom-button"
          data-action="zoom-in"
          aria-label="放大图片"
          :disabled="scale >= 5"
          @click="zoom(0.5)"
        >
          <image class="zoom-icon" src="/static/listening/r17-plus.svg" mode="aspectFit" /></button
      ></view>
    </view>
    <view class="image-help"
      ><text class="image-help-primary">双指缩放 · 放大后可拖动查看</text
      ><text class="image-help-secondary">返回文章后保留原阅读位置</text></view
    >
  </view>
</template>
<style scoped lang="scss">
.image-veil {
  position: fixed;
  z-index: 100;
  inset: 0;
  display: flex;
  flex-direction: column;
  padding-top: env(safe-area-inset-top);
  background: #fffcf5;
  color: #2b4438;

  .image-header {
    display: flex;
    align-items: center;
    min-height: 66px;
    padding: 0 24rpx;
  }

  .image-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
  }

  .back-icon {
    width: 22px;
    height: 22px;
  }

  .image-title {
    font-size: 36.538rpx;
    font-weight: 700;
  }

  .image-container {
    display: flex;
    flex: 1;
    min-height: 0;
    flex-direction: column;
    overflow: hidden;
  }

  .image-area {
    width: 100%;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .image-pan,
  .original-image {
    width: 100%;
    height: 100%;
  }

  .image-tools {
    display: flex;
    flex: none;
    justify-content: center;
    gap: 23.077rpx;
    padding: 24rpx 20rpx 0;
  }

  .zoom-button,
  .fit-button {
    min-height: 44px;
    margin: 0;
    padding: 0 20rpx;
    border: 1px solid #dfe5d8;
    border-radius: 19.231rpx;
    background: #fffcf5;
  }

  .zoom-icon {
    width: 19px;
    height: 19px;
  }

  .zoom-button {
    width: 44px;
    padding: 0;
    font-size: 36rpx;
  }

  .fit-button {
    min-width: 94px;
    font-size: 23.077rpx;
  }

  .image-help {
    flex: none;
    padding: 28rpx 20rpx max(34rpx, env(safe-area-inset-bottom));
    text-align: center;
  }

  .image-help-primary,
  .image-help-secondary {
    display: block;
    color: #586c5b;
    font-size: 23.077rpx;
    line-height: 1.7;
  }

  .image-help-secondary {
    margin-top: 8rpx;
    font-size: 21.154rpx;
  }
}
</style>
