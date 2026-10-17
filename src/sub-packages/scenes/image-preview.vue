<script setup lang="ts">
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { ref } from 'vue'

import { session } from '@/services/api'
import { ApiError } from '@/services/errors'
import { activeImagePreview, closeImagePreview } from '@/services/image-preview'
import { mediaAddress } from '@/services/media-service'
import { backTo } from '@/services/navigation'
import { Routes } from '@/shared/constants/navigation'

import type { ImagePreviewContext } from '@/shared/types/image-preview'
const src = ref(''),
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
  <view class="image-overlay"
    ><button class="close-image" aria-label="关闭大图" @click="close">×</button
    ><view v-if="busy" class="overlay-message">正在加载原图…</view
    ><view v-if="error" class="overlay-message"
      ><text>{{ error }}</text
      ><button :disabled="busy" @click="load">重新加载</button
      ><button @click="close">关闭</button></view
    ><movable-area v-if="src && !error" class="zoom-area"
      ><movable-view
        class="zoom-image"
        direction="all"
        scale
        :scale-min="1"
        :scale-max="5"
        :scale-value="1"
        :out-of-bounds="false"
        ><image :src="src" mode="aspectFit" @error="imageFailed" /></movable-view></movable-area
    ><text class="zoom-hint">双指缩放，放大后可拖动查看</text></view
  >
</template>
<style scoped lang="scss">
.image-overlay {
  position: fixed;
  inset: 0;
  background: #142018;
  color: #fff;

  .close-image {
    position: absolute;
    right: 32rpx;
    top: calc(28rpx + env(safe-area-inset-top));
    width: 80rpx;
    height: 80rpx;
    border: 0;
    border-radius: 50%;
    background: #fff2;
    color: #fff;
    font-size: 48rpx;
    padding: 0;
    z-index: 5;
  }

  .zoom-area {
    width: 100%;
    height: 100vh;
  }

  .zoom-image {
    width: 100%;
    height: 100%;

    image {
      width: 100%;
      height: 100%;
    }
  }

  .zoom-hint {
    position: absolute;
    bottom: calc(30rpx + env(safe-area-inset-bottom));
    left: 0;
    right: 0;
    text-align: center;
    font-size: 22rpx;
    color: #fff9;
    pointer-events: none;
  }

  .overlay-message {
    position: absolute;
    top: 40%;
    left: 40rpx;
    right: 40rpx;
    text-align: center;
    font-size: 26rpx;

    button {
      margin-top: 24rpx;
      color: #fff;
      background: #fff2;
    }
  }
}
</style>
