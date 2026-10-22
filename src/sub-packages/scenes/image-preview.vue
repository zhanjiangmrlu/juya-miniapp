<script setup lang="ts">
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { nextTick, ref, watch } from 'vue'

import ShareSummary from '@/features/share/components/share-summary.vue'
import { session } from '@/services/api'
import { ApiError } from '@/services/errors'
import {
  activeImagePreview,
  closeImagePreview,
  discardImagePreview,
  prepareImagePreviewSource
} from '@/services/image-preview'
import { mediaAddress } from '@/services/media-service'
import { setShareMenu } from '@/services/native-share'
import { backTo } from '@/services/navigation'
import { resourceURL, sendPublicRequest } from '@/services/platform'
import { runtimeMode } from '@/services/runtime-mode'
import { createShareService, shareTargetURL } from '@/services/share-service'
import { IMAGE_MAX_SCALE, IMAGE_MIN_SCALE } from '@/shared/constants/media'
import { Routes } from '@/shared/constants/navigation'
import { SHARE_ID_PATTERN } from '@/shared/constants/share'
import { ShareTarget } from '@/shared/enums/share'

import type { ImagePreviewContext, ImageScaleEvent } from '@/shared/types/image-preview'
const zoom = ref(IMAGE_MIN_SCALE),
  scaleValue = ref(IMAGE_MIN_SCALE),
  topInset = ref(0),
  src = ref(''),
  error = ref(''),
  busy = ref(false),
  imageLoading = ref(false)
const browseOnly = runtimeMode.browseOnly,
  publicShare = createShareService({ send: sendPublicRequest, resource: resourceURL })
let context: ImagePreviewContext | null = null,
  alive = true,
  generation = 0,
  targetId = ''
/** 模式收紧时同步撤销原图与在途结果，仅重新获取匿名摘要 */
const restrict = () => {
  generation++
  src.value = ''
  context = null
  discardImagePreview()
  imageLoading.value = false
  busy.value = false
  error.value = ''
  setShareMenu(false)
  if (SHARE_ID_PATTERN.test(targetId)) void publicShare.prepare(targetId)
}
/** 独立请求原图，用户重试时重新签发同一版本的授权地址
 * @param reuse 是否复用本次查看已取得的原图文件或进行中的请求
 */
const load = async (reuse = false) => {
  if (runtimeMode.update()) return
  if (!context || busy.value) return
  const run = ++generation
  busy.value = true
  error.value = ''
  src.value = ''
  imageLoading.value = true
  try {
    const value = context.loadSource
      ? await context.loadSource(!reuse)
      : await prepareImagePreviewSource(
          await mediaAddress(context.cardId, context.imageId, context.versionId, false, true)
        )
    if (alive && run === generation && !runtimeMode.update()) src.value = value
  } catch (reason) {
    if (!alive || run !== generation || runtimeMode.update()) return
    imageLoading.value = false
    if (reason instanceof ApiError && [401, 409, 410].includes(reason.status)) {
      context.onInvalid(reason)
      backTo(Routes.LEARNING)
    } else error.value = '大图暂未加载，点击重试'
  } finally {
    if (alive && run === generation) busy.value = false
  }
}
/** 图片本体失败后读取真实卡片状态，再决定重试或结束覆盖层 */
const imageFailed = async () => {
  if (runtimeMode.update()) return
  imageLoading.value = false
  error.value = '大图暂未加载，点击重试'
  if (!context) return
  const active = context,
    run = generation
  try {
    await session.request(
      `/api/mini/v1/cards/${context.cardId}?version_id=${encodeURIComponent(context.versionId)}`
    )
  } catch (reason) {
    if (!alive || run !== generation || context !== active || runtimeMode.update()) return
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
  if (Number.isFinite(event.detail.scale))
    zoom.value = Math.min(IMAGE_MAX_SCALE, Math.max(IMAGE_MIN_SCALE, event.detail.scale))
}
/** 按钮调整使用当前手势比例，手势事件只更新显示，避免反向写入干扰连续缩放
 * @param value 用户选择的目标缩放比例
 */
const setZoom = async (value: number) => {
  const target = Math.min(IMAGE_MAX_SCALE, Math.max(IMAGE_MIN_SCALE, value))
  // 手势后还原可能与上次指令相同，先同步当前比例，确保原生视图收到新的还原指令
  if (scaleValue.value === target && zoom.value !== target) {
    scaleValue.value = zoom.value
    await nextTick()
  }
  zoom.value = target
  scaleValue.value = target
}
/** 原图像素绘制完成后结束加载提示 */
const imageLoaded = () => {
  imageLoading.value = false
}
/** 关闭当前覆盖层，不退出原场景 */
const close = () => backTo(Routes.LEARNING)
onLoad((query) => {
  targetId = typeof query?.id === 'string' && SHARE_ID_PATTERN.test(query.id) ? query.id : ''
  setShareMenu(false)
  if (runtimeMode.update()) {
    restrict()
    return
  }
  const info = uni.getWindowInfo?.() || uni.getSystemInfoSync?.()
  topInset.value = info?.statusBarHeight || 0
  context = activeImagePreview()
  if (!context || context.cardId !== query?.id) {
    error.value = '请从场景详情打开图片'
    return
  }
  if (context.loadSource) void load(true)
  else if (context.initialSrc) {
    src.value = context.initialSrc
    imageLoading.value = true
  } else void load()
})
onShow(() => {
  setShareMenu(false)
  if (runtimeMode.update()) restrict()
})
watch(
  browseOnly,
  (restricted) => {
    if (restricted) restrict()
    else if (targetId)
      uni.redirectTo({ url: shareTargetURL({ target: ShareTarget.SCENE, id: targetId }) })
  },
  { flush: 'sync' }
)
onUnload(() => {
  generation++
  publicShare.clear()
  alive = false
  if (context) closeImagePreview(context)
})
</script>
<template>
  <view v-if="browseOnly" class="summary-overlay"
    ><text class="summary-heading">分享摘要</text
    ><ShareSummary
      :summary="publicShare.summary.value"
      :image="
        publicShare.summary.value ? resourceURL(publicShare.summary.value.images.timeline.url) : ''
      "
      :busy="publicShare.busy.value"
      :error="publicShare.error.value"
      @retry="restrict"
  /></view>
  <view v-else class="image-overlay" :style="{ '--viewer-top': `${topInset}px` }">
    <view class="image-top"
      ><button class="close-image" aria-label="关闭大图" @click="close">
        <image src="/static/design/close.svg" mode="aspectFit" aria-hidden="true" /></button
      ><text>场景卡原图</text><view class="top-spacer"
    /></view>
    <view v-if="(busy || imageLoading) && !error" class="overlay-message">正在加载原图…</view>
    <view v-if="error" class="overlay-message"
      ><text>{{ error }}</text
      ><button :disabled="busy" @click="load()">重新加载</button
      ><button @click="close">关闭</button></view
    >
    <movable-area v-if="src && !error" class="zoom-area" scale-area
      ><movable-view
        class="zoom-image"
        direction="all"
        scale
        :scale-min="IMAGE_MIN_SCALE"
        :scale-max="IMAGE_MAX_SCALE"
        :scale-value="scaleValue"
        :animation="false"
        :inertia="false"
        :out-of-bounds="false"
        @scale="scaleChanged"
        ><image
          :src="src"
          mode="aspectFit"
          :webp="true"
          :alt="context?.title"
          @load="imageLoaded"
          @error="imageFailed" /></movable-view
    ></movable-area>
    <view class="image-controls"
      ><button
        aria-label="缩小原图"
        :disabled="zoom <= IMAGE_MIN_SCALE"
        @click="setZoom(zoom - 0.25)"
      >
        －</button
      ><text>{{ Math.round(zoom * 100) }}%</text
      ><button
        aria-label="放大原图"
        :disabled="zoom >= IMAGE_MAX_SCALE"
        @click="setZoom(zoom + 0.25)"
      >
        ＋</button
      ><button class="reset-image" @click="setZoom(1)">还原</button></view
    >
  </view>
</template>
<style scoped lang="scss">
.summary-overlay {
  min-height: 100vh;
  padding: calc(46.154rpx + env(safe-area-inset-top)) 46.154rpx;
  background: #fffcf5;

  .summary-heading {
    display: block;
    margin-bottom: 46.154rpx;
    color: #2b4438;
    font-size: 28.846rpx;
    line-height: 44.712rpx;
  }
}

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
    padding: calc(28.846rpx + max(var(--viewer-top), env(safe-area-inset-top))) 19.231rpx 28.846rpx;
    font-size: 23.077rpx;
    flex-shrink: 0;
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
    touch-action: none;
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
      box-sizing: border-box;
      width: 69.231rpx;
      height: 69.231rpx;
      flex-shrink: 0;
      border: 1px solid #647b68;
      border-radius: 19.231rpx;
      padding: 0;
      font-size: 23.077rpx;
      line-height: 65.385rpx;
    }

    [disabled] {
      opacity: 0.45;
    }

    .reset-image {
      width: 84.615rpx;
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
    z-index: 6;

    button {
      margin-top: 23.077rpx;
      color: #fff;
      background: #fff2;
    }
  }
}
</style>
