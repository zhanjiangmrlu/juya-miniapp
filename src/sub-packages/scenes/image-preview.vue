<script setup lang="ts">
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { ref } from 'vue'

import { session } from '@/services/api'
import { ApiError } from '@/services/errors'
import { activeImagePreview, closeImagePreview } from '@/services/image-preview'
import { mediaAddress } from '@/services/media-service'
import { backTo } from '@/services/navigation'
import { Routes } from '@/shared/constants/navigation'

import type { ImagePreviewContext, ImageScaleEvent } from '@/shared/types/image-preview'
const zoom = ref(1),
  src = ref(''),
  error = ref(''),
  busy = ref(false)
let context: ImagePreviewContext | null = null,
  alive = true
/** 获取同一版本的原图地址，失败不退回不清晰缩略图 */
const load = async () => {
  if (!context || busy.value) return
  busy.value = true
  error.value = ''
  try {
    const value = await mediaAddress(context.cardId, context.imageId, context.versionId)
    if (alive) src.value = value
  } catch (reason) {
    if (!alive) return
    if (reason instanceof ApiError && [401, 409, 410].includes(reason.status)) {
      context.onInvalid(reason)
      backTo(Routes.LEARNING)
    } else error.value = '大图暂未加载，点击重试'
  } finally {
    if (alive) busy.value = false
  }
}
/** 图片本体失败后读取真实卡片状态，再决定重试或结束覆盖层 */
const imageFailed = async () => {
  error.value = '大图暂未加载，点击重试'
  if (!context) return
  try {
    await session.request(
      `/api/mini/v1/cards/${context.cardId}?version_id=${encodeURIComponent(context.versionId)}`
    )
  } catch (reason) {
    if (reason instanceof ApiError && [401, 409, 410].includes(reason.status)) {
      context.onInvalid(reason)
      backTo(Routes.LEARNING)
    }
  }
}
/** 记录双指缩放后的比例，同步底部缩放控件
 * @param event 原图移动视图返回的实际缩放比例
 */
const scaleChanged = (event: ImageScaleEvent) => {
  zoom.value = event.detail.scale
}
/** 关闭当前覆盖层，不退出原场景 */
const close = () => backTo(Routes.LEARNING)
onLoad((query) => {
  context = activeImagePreview()
  if (!context || context.cardId !== query?.id) {
    error.value = '请从场景详情打开图片'
    return
  }
  void load()
})
onUnload(() => {
  alive = false
  if (context) closeImagePreview(context)
})
</script>
<template>
  <view class="image-overlay">
    <view class="image-top"
      ><button class="close-image" aria-label="关闭大图" @click="close">
        <image src="/static/design/close.svg" mode="aspectFit" aria-hidden="true" /></button
      ><text>场景卡原图</text><view class="top-spacer"
    /></view>
    <view v-if="busy" class="overlay-message">正在加载原图…</view>
    <view v-if="error" class="overlay-message"
      ><text>{{ error }}</text
      ><button :disabled="busy" @click="load">重新加载</button
      ><button @click="close">关闭</button></view
    >
    <movable-area v-if="src && !error" class="zoom-area"
      ><movable-view
        class="zoom-image"
        direction="all"
        scale
        :scale-min="1"
        :scale-max="5"
        :scale-value="zoom"
        :out-of-bounds="false"
        @scale="scaleChanged"
        ><image :src="src" mode="aspectFit" @error="imageFailed" /></movable-view
    ></movable-area>
    <view class="image-controls"
      ><button aria-label="缩小原图" :disabled="zoom <= 1" @click="zoom = Math.max(1, zoom - 0.25)">
        －</button
      ><text>{{ Math.round(zoom * 100) }}%</text
      ><button aria-label="放大原图" :disabled="zoom >= 5" @click="zoom = Math.min(5, zoom + 0.25)">
        ＋</button
      ><button class="reset-image" @click="zoom = 1">还原</button></view
    >
  </view>
</template>
<style scoped lang="scss">
.image-overlay {
  position: fixed;
  inset: 0;
  background: #20362b;
  color: #fff;
  display: flex;
  flex-direction: column;

  .image-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: calc(28.846rpx + env(safe-area-inset-top)) 19.231rpx 28.846rpx;
    font-size: 23.077rpx;
    z-index: 5;
  }

  .close-image {
    width: 84.615rpx;
    height: 84.615rpx;
    border: 0;
    background: transparent;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 46.154rpx;
    margin: 0;
    padding: 0;

    image {
      width: 38.462rpx;
      height: 38.462rpx;
    }
  }

  button::after {
    border: 0;
  }

  .top-spacer {
    width: 84.615rpx;
  }

  .zoom-area {
    width: calc(100% - 46.154rpx);
    height: 0;
    margin: 0 23.077rpx;
    flex: 1;
    overflow: hidden;
  }

  .zoom-image {
    width: 100%;
    height: 100%;

    image {
      width: 100%;
      height: 100%;
    }
  }

  .image-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 23.077rpx;
    padding: 23.077rpx 34.615rpx max(51.923rpx, env(safe-area-inset-bottom));
    font-size: 23.077rpx;
    z-index: 5;

    button {
      margin: 0;
      color: #fff;
      background: transparent;
      min-width: 69.231rpx;
      min-height: 69.231rpx;
      border: 1px solid #647b68;
      border-radius: 19.231rpx;
      padding: 11.538rpx 19.231rpx;
      font-size: 23.077rpx;
      line-height: 34.615rpx;
    }

    .reset-image {
      border: 0;
    }
  }

  .overlay-message {
    position: absolute;
    top: 40%;
    left: 38.462rpx;
    right: 38.462rpx;
    text-align: center;
    font-size: 25rpx;

    button {
      margin-top: 23.077rpx;
      color: #fff;
      background: #fff2;
    }
  }
}
</style>
