<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import AppLoading from '@/components/app-loading/app-loading.vue'
import { session } from '@/services/api'
import { clientThumbnail } from '@/services/client-thumbnail'
import { mediaAddress } from '@/services/media-service'
import { openScene } from '@/services/navigation'
import { sceneImageId, sceneThumbnailURL } from '@/services/scene-image'

import type { PublishedScene } from '@/shared/types/learning'
import type { SceneCardProps } from '@/shared/types/learning-components'
const props = withDefaults(defineProps<SceneCardProps>(), {
  history: false,
  featured: false,
  compact: false
})
const src = ref(''),
  imageError = ref(false),
  imageLoading = ref(false),
  imageKey = ref(0)
let generation = 0
const locked = computed(() => props.card.access?.can_learn === false)
/** 受限场景只提示授权，不建立来源队列或预取正文 */
const open = () => {
  if (locked.value) {
    uni.showModal({ title: '学习授权提示', content: '此场景需学习授权', showCancel: false })
    return
  }
  void openScene(props.card.id, available.value ? props.source : undefined, props.day)
}
const available = computed(() => !('available' in props.card) || props.card.available)
const images = computed(() =>
  src.value && !imageError.value ? [{ src: src.value, generation: imageKey.value }] : []
)
const completed = computed(() => 'state' in props.card && props.card.state.completed)
const started = computed(
  () => 'state' in props.card && 'started' in props.card.state && props.card.state.started
)
/** 仅展示当前发布版本的实际内容数量，缺少的统计不填入示例值 */
const contentSummary = computed(() => {
  if (!available.value || !('vocabulary_count' in props.card)) return ''
  const words = props.card.vocabulary_count,
    chunks = props.card.chunk_count
  return [
    typeof words === 'number' && words > 0 ? `${words} 个词汇` : '',
    typeof chunks === 'number' && chunks > 0 ? `${chunks} 个语块` : ''
  ]
    .filter(Boolean)
    .join(' · ')
})
/** 优先读取已有缩略图，仅为可读发布卡补齐前端缩图
 * @param renew 用户重试时是否重新签发图片地址
 */
const loadImage = async (renew = false) => {
  if (renew && imageLoading.value) return
  const run = ++generation
  src.value = ''
  imageError.value = false
  imageLoading.value = true
  imageKey.value = run
  const thumbnailId = sceneImageId(props.card.thumbnail_id)
  if (!thumbnailId && (!available.value || locked.value || !props.card.version_id)) {
    src.value = ''
    imageLoading.value = false
    return
  }
  try {
    const cardId = props.card.id,
      version = props.card.version_id
    const value = thumbnailId
      ? await mediaAddress(cardId, thumbnailId, version, props.history || locked.value, renew).then(
          sceneThumbnailURL
        )
      : (
          await clientThumbnail(
            JSON.stringify([session.userId(), cardId, version]),
            async () => {
              const scene = await session.request<PublishedScene>(
                `/api/mini/v1/cards/${encodeURIComponent(cardId)}?version_id=${encodeURIComponent(version!)}&mark_started=false`
              )
              const imageId = sceneImageId(null, scene.content.image_id, true)
              if (!imageId) throw new Error('场景图片暂不可用')
              return mediaAddress(cardId, imageId, version, false, renew)
            },
            renew
          )
        ).thumbnailSrc
    if (run === generation) src.value = value
  } catch {
    if (run === generation) {
      src.value = ''
      imageLoading.value = false
      imageError.value = true
    }
  }
}
/** 本次缩略图像素加载完成，run 为该图片建立时的请求代次 */
const imageLoaded = (run: number) => {
  if (run === generation) imageLoading.value = false
}
/** 本次缩略图像素失败，run 为该图片建立时的请求代次 */
const imageFailed = (run: number) => {
  if (run !== generation) return
  imageLoading.value = false
  imageError.value = true
}
watch(
  () =>
    JSON.stringify([props.card.id, props.card.thumbnail_id, props.card.version_id, props.history]),
  () => {
    void loadImage()
  },
  { immediate: true }
)
onBeforeUnmount(() => {
  generation++
})
</script>
<template>
  <view class="scene-row" :class="{ unavailable: !available, featured, compact }" @click="open"
    ><view class="thumbnail"
      ><image
        v-for="image in images"
        :key="image.generation"
        :src="image.src"
        mode="aspectFit"
        :webp="true"
        @load="imageLoaded(image.generation)"
        @error="imageFailed(image.generation)"
      /><button v-if="imageError" class="retry-image" @click.stop="loadImage(true)">重试图片</button
      ><view v-if="imageLoading" class="image-loading"
        ><AppLoading compact stacked label="正在加载图片" /></view
      ><text v-else-if="!src && !imageError" class="image-placeholder">暂无场景图</text></view
    ><view class="scene-copy"
      ><text v-if="card.title_en" class="scene-english">{{ card.title_en }}</text
      ><text class="scene-name">{{ card.name }}</text
      ><text v-if="!available" class="availability">{{
        'unavailable_reason' in card && card.unavailable_reason === 'deleted'
          ? '已删除 · 当前不可用'
          : '已下线 · 当前不可用'
      }}</text
      ><text v-else-if="locked" class="availability">需学习授权</text>
      <text v-else-if="card.access?.is_free" class="scene-hint">免费开放</text>
      <text v-else-if="completed && !$slots.default" class="scene-hint">已学过 · 点击复习</text>
      <text v-else-if="!$slots.default" class="scene-hint">{{
        started ? '学习中 · 继续学习' : '未开始'
      }}</text>
      <text v-if="contentSummary" class="scene-meta">{{ contentSummary }}</text>
      <slot v-if="available" /></view
    ><image class="arrow" src="/static/design/chevron.svg" mode="aspectFit" aria-hidden="true"
  /></view>
</template>
<style scoped lang="scss">
.scene-row {
  display: flex;
  align-items: center;
  gap: 26.923rpx;
  width: 100%;
  min-height: 268.577rpx;
  padding: 34.615rpx 0;

  .thumbnail {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 119.231rpx;
    height: 180.769rpx;
    border: 1px solid #dfe5d8;
    border-radius: 9.615rpx;
    background: #fff;
    overflow: hidden;

    image {
      width: 100%;
      height: 100%;
    }

    .retry-image {
      padding: 0;
      border: 0;
      background: none;
      color: #586c5b;
      font-size: 19.231rpx;
    }

    .image-placeholder {
      font-size: 19.231rpx;
      color: #586c5b;
    }

    .image-loading {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #e4f0db;
      color: #586c5b;
      font-size: 19.231rpx;
      text-align: center;
    }
  }

  .scene-copy {
    align-self: flex-start;
    flex: 1;
    min-width: 0;

    .scene-name {
      display: block;
      margin: 9.615rpx 0 0;
      font-size: 25rpx;
      font-weight: 500;
      line-height: 42.5rpx;
      overflow-wrap: anywhere;
    }

    .scene-english {
      display: block;
      font-family: var(--app-serif-font, Fraunces, Georgia, serif);
      font-size: 34.615rpx;
      font-weight: 400;
      line-height: 48.462rpx;
      letter-spacing: -0.015em;
      overflow-wrap: anywhere;
    }

    .scene-hint,
    .scene-meta,
    .availability {
      display: block;
      margin-top: 11.538rpx;
      color: #586c5b;
      font-size: 21.154rpx;
      line-height: 35.962rpx;
    }

    .scene-meta {
      margin-top: 13.462rpx;
    }
  }

  .arrow {
    flex-shrink: 0;
    width: 34.615rpx;
    height: 34.615rpx;
  }

  &.featured {
    gap: 28.846rpx;
    min-height: 310.519rpx;
    margin-bottom: 7.692rpx;
    padding: 25rpx;
    border: 1px solid #dfe5d8;
    border-radius: 25rpx;
    background: #fff;

    .scene-english {
      font-size: 38.462rpx;
      line-height: 51.923rpx;
    }

    .scene-name {
      margin-top: 13.462rpx;
    }

    .arrow {
      align-self: flex-end;
      margin-bottom: 19.231rpx;
    }

    .thumbnail {
      width: 151.923rpx;
      height: 228.846rpx;
      border-radius: 7.692rpx;
    }
  }

  &.compact {
    min-height: 0;
    padding: 23.077rpx 0;
    gap: 21.154rpx;

    .thumbnail {
      width: 67.308rpx;
      height: 101.923rpx;
    }

    .scene-name {
      font-size: 21.154rpx;
    }
  }
}
</style>
