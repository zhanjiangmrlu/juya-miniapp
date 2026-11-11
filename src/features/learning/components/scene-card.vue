<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import AppLoading from '@/components/app-loading/app-loading.vue'
// #ifdef JUYA_ANALYTICS
import { businessAnalytics } from '@/services/analytics-business'
// #endif
import { session } from '@/services/api'
import { clientThumbnail } from '@/services/client-thumbnail'
import { dateText } from '@/services/display'
import { localImageSource } from '@/services/local-image'
import { mediaAddress } from '@/services/media-service'
import {
  nativeErrorFields,
  probeNativeImage,
  recordNativeDiagnostic
} from '@/services/native-diagnostics'
import { openScene } from '@/services/navigation'
import { sceneImageId, sceneThumbnailURL } from '@/services/scene-image'
import { LEARNING_FEATURES } from '@/shared/constants/learning-features'
// #ifdef JUYA_ANALYTICS
import { AnalyticsEvent } from '@/shared/enums/analytics'
// #endif
import { QueueSource } from '@/shared/enums/learning'

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
  // #ifdef JUYA_ANALYTICS
  businessAnalytics.track(AnalyticsEvent.CONTENT_CLICK, {
    content_type: 'scene',
    content_id: props.card.id,
    entry_source: props.source || 'direct'
  })
  // #endif

  void openScene(
    props.card.id,
    available.value && !locked.value ? props.source : undefined,
    props.day
  )
}
const available = computed(() => !('available' in props.card) || props.card.available)
const images = computed(() =>
  src.value && !imageError.value ? [{ src: src.value, generation: imageKey.value }] : []
)
const completed = computed(
  () =>
    props.source === QueueSource.RECORDS || ('state' in props.card && props.card.state?.completed)
)
/** 将服务端完成或收藏时间显示为北京时间月日
 * @param value 已确认的ISO时间
 */
const shortDate = (value: string) => {
  const formatted = dateText(value)
  return /^\d{4}-\d{2}-\d{2}/.test(formatted)
    ? `${Number(formatted.slice(5, 7))}月${Number(formatted.slice(8, 10))}日`
    : '暂未获取'
}
const historyMeta = computed(() => {
  const card = props.card
  if (
    props.source === QueueSource.FAVORITES &&
    'favorited_at' in card &&
    typeof card.favorited_at === 'string'
  )
    return `收藏于${shortDate(card.favorited_at)}`
  if (!props.history || !('first_completed_at' in card)) return ''
  return [
    card.first_completed_at ? `首次完成${shortDate(card.first_completed_at)}` : '',
    card.last_completed_at ? `最近学习${shortDate(card.last_completed_at)}` : ''
  ]
    .filter(Boolean)
    .join(' · ')
})
const started = computed(
  () =>
    'state' in props.card &&
    props.card.state &&
    'started' in props.card.state &&
    props.card.state.started
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
            JSON.stringify([session.identity(), cardId, version]),
            async () => {
              const scene = await session.contentRequest<PublishedScene>(
                `/api/mini/v1/cards/${encodeURIComponent(cardId)}?version_id=${encodeURIComponent(version!)}&mark_started=false`
              )
              const imageId = sceneImageId(null, scene.content.image_id, true)
              if (!imageId) throw new Error('场景图片暂不可用')
              return mediaAddress(cardId, imageId, version, false, renew)
            },
            renew
          )
        ).thumbnailSrc
    const displaySource = await localImageSource(value)
    if (run === generation) src.value = displaySource
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
  if (import.meta.env.VITE_NATIVE_DIAGNOSTICS === 'true' && run === generation)
    recordNativeDiagnostic('image-load', { surface: 'list', local: !/^https?:/.test(src.value) })
  if (run === generation) imageLoading.value = false
}
/** 本次缩略图像素失败，run 为该图片建立时的请求代次 */
const imageFailed = (run: number, event?: Event | { detail?: unknown }) => {
  if (run !== generation) return
  if (import.meta.env.VITE_NATIVE_DIAGNOSTICS === 'true') {
    recordNativeDiagnostic('image-error', {
      surface: 'list',
      local: !/^https?:/.test(src.value),
      ...nativeErrorFields(event && 'detail' in event ? event.detail : undefined)
    })
    probeNativeImage(src.value, 'list')
  }
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
        class="thumbnail-image"
        :src="image.src"
        mode="aspectFit"
        :webp="true"
        @load="imageLoaded(image.generation)"
        @error="imageFailed(image.generation, $event)"
      /><button v-if="imageError" class="retry-image" @click.stop="loadImage(true)">重试图片</button
      ><view v-if="imageLoading" class="image-loading"
        ><AppLoading compact stacked label="正在加载图片" /></view
      ><text v-else-if="!src && !imageError" class="image-placeholder">暂无场景图</text></view
    ><view class="scene-copy"
      ><text class="scene-name">{{ card.name }}</text
      ><text v-if="card.title_en" class="scene-english">{{ card.title_en }}</text
      ><view
        class="scene-state-line"
        :class="{ 'has-note': 'has_study_note' in card && card.has_study_note }"
        ><text v-if="!available" class="availability">{{
          'unavailable_reason' in card && card.unavailable_reason === 'deleted'
            ? '已删除 · 当前不可用'
            : '已下线 · 当前不可用'
        }}</text
        ><text v-else-if="locked" class="availability">{{
          LEARNING_FEATURES.authorization ? '需学习授权' : '暂未开放'
        }}</text>
        <text v-else-if="source === QueueSource.LEARNING_NOTES" class="scene-hint">{{
          card.access?.is_free ? '免费开放' : '授权可学'
        }}</text>
        <text v-else-if="history && completed" class="scene-hint">已学过</text>
        <text v-else-if="card.access?.is_free" class="scene-hint">免费开放</text>
        <text v-else-if="completed && !$slots.default" class="scene-hint">已学过 · 点击复习</text>
        <text v-else-if="source === QueueSource.FAVORITES" class="scene-hint">已收藏</text>
        <text v-else-if="!$slots.default" class="scene-hint">{{
          started ? '学习中 · 继续学习' : '未开始'
        }}</text>
        <view v-if="'has_study_note' in card && card.has_study_note" class="note-label"
          ><image src="/static/design/study-note-label.svg" mode="aspectFit" />含学习笔记</view
        > </view
      ><text v-if="contentSummary" class="scene-meta">{{ contentSummary }}</text>
      <view v-if="source === QueueSource.LEARNING_NOTES && completed" class="learned-note"
        ><image src="/static/design/study-note-learned.svg" mode="aspectFit" />已学／可复习</view
      >
      <text v-if="historyMeta" class="history-meta">{{ historyMeta }}</text
      ><slot v-if="available" /></view
    ><image
      class="arrow"
      :src="locked ? '/static/design/scene-row-lock.svg' : '/static/design/scene-row-chevron.svg'"
      mode="aspectFit"
      aria-hidden="true"
  /></view>
</template>
<style scoped lang="scss">
.scene-row {
  display: flex;
  align-items: center;
  gap: 30.769rpx;
  width: 100%;
  min-height: 278.846rpx;
  padding: 34.615rpx 0;
  border-bottom: 1px solid #dfe5d8;

  .thumbnail {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 123.077rpx;
    height: 180.769rpx;
    border: 1px solid #dfe5d8;
    border-radius: 9.615rpx;
    background: #fff;
    overflow: hidden;

    .thumbnail-image {
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
    align-self: center;
    flex: 1;
    min-width: 0;

    .scene-name {
      display: block;
      margin: 0;
      font-size: 30.769rpx;
      font-weight: 700;
      line-height: 42.5rpx;
      overflow-wrap: anywhere;
    }

    .scene-english {
      display: block;
      font-family: var(--app-serif-font, Fraunces, Georgia, serif);
      font-size: 38.462rpx;
      font-weight: 400;
      line-height: 51.923rpx;
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

  .note-label,
  .learned-note {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 4px;
    color: #41664d;
    font-size: 10px;
    line-height: 17px;

    image {
      width: 12px;
      height: 14px;
    }
  }

  .learned-note image {
    width: 12px;
    height: 12px;
  }

  .scene-state-line.has-note {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
  }

  .has-note {
    .scene-hint,
    .note-label,
    .availability {
      margin-top: 0;
    }
  }

  .history-meta {
    display: block;
    margin-top: 11.538rpx;
    color: #586c5b;
    font-size: 21.154rpx;
    line-height: 1.8;
  }

  .arrow {
    flex-shrink: 0;
    width: 17px;
    height: 18px;
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
