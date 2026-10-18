<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import { mediaAddress } from '@/services/media-service'
import { openScene } from '@/services/navigation'

import type { SceneCardProps } from '@/shared/types/learning-components'
const props = withDefaults(defineProps<SceneCardProps>(), {
  history: false,
  featured: false,
  compact: false
})
const src = ref(''),
  imageError = ref(false)
let generation = 0
const available = computed(() => !('available' in props.card) || props.card.available)
const completed = computed(() => 'state' in props.card && props.card.state.completed)
/** 单独重取短期缩略图，图片失败不阻止打开可读内容 */
const loadImage = async () => {
  const run = ++generation
  imageError.value = false
  if (!props.card.thumbnail_id) {
    src.value = ''
    return
  }
  try {
    const value = await mediaAddress(
      props.card.id,
      props.card.thumbnail_id,
      props.card.version_id,
      props.history
    )
    if (run === generation) src.value = value
  } catch {
    if (run === generation) {
      src.value = ''
      imageError.value = true
    }
  }
}
watch(
  () => [props.card.id, props.card.thumbnail_id, props.card.version_id],
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
  <view
    class="scene-row"
    :class="{ unavailable: !available, featured, compact }"
    @click="openScene(card.id)"
    ><view class="thumbnail"
      ><image
        v-if="src && !imageError"
        :src="src"
        mode="aspectFit"
        @error="imageError = true"
      /><button v-else-if="imageError" class="retry-image" @click.stop="loadImage">重试图片</button
      ><text v-else class="image-placeholder">场景</text></view
    ><view class="scene-copy"
      ><text class="scene-name">{{ card.name }}</text
      ><text v-if="card.title_en" class="scene-english">{{ card.title_en }}</text
      ><text v-if="!available" class="availability">{{
        'unavailable_reason' in card && card.unavailable_reason === 'deleted'
          ? '已删除 · 当前不可用'
          : '已下线 · 当前不可用'
      }}</text
      ><text v-else-if="completed && !$slots.default" class="scene-hint">已学过 · 点击复习</text>
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
  min-height: 251.923rpx;
  padding: 34.615rpx 0;

  .thumbnail {
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
  }

  .scene-copy {
    flex: 1;
    min-width: 0;

    .scene-name {
      display: block;
      margin: 9.615rpx 0;
      font-size: 25rpx;
      font-weight: 500;
      line-height: 42.5rpx;
      overflow-wrap: anywhere;
    }

    .scene-english {
      display: block;
      font-family: Fraunces, Georgia, serif;
      font-size: 34.615rpx;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }

    .scene-hint,
    .availability {
      display: block;
      margin-top: 11.538rpx;
      color: #586c5b;
      font-size: 21.154rpx;
      line-height: 35.962rpx;
    }
  }

  .arrow {
    flex-shrink: 0;
    width: 34.615rpx;
    height: 34.615rpx;
  }

  &.featured {
    gap: 28.846rpx;
    min-height: 282.692rpx;
    margin-bottom: 7.692rpx;
    padding: 25rpx;
    border: 1px solid #dfe5d8;
    border-radius: 25rpx;
    background: #fff;

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
