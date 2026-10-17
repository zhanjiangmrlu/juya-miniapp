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
      ><text v-if="!available" class="availability">{{
        'unavailable_reason' in card && card.unavailable_reason === 'deleted'
          ? '已删除 · 学习成绩保留'
          : '暂不可用 · 学习成绩保留'
      }}</text
      ><text v-else class="scene-hint">{{
        completed ? '已学过 · 点击复习' : '场景对话 · 重点词汇'
      }}</text>
      ><slot /></view
    ><text class="arrow">›</text></view
  >
</template>
<style scoped lang="scss">
.scene-row {
  display: flex;
  align-items: center;
  gap: 26.923rpx;
  width: 100%;
  border-bottom: 1px solid #dfe5d8;
  padding: 34.615rpx 0;

  .thumbnail {
    width: 119.231rpx;
    height: 180.769rpx;
    flex-shrink: 0;
    border: 1px solid #dfe5d8;
    border-radius: 9.615rpx;
    background: #fff;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;

    image {
      width: 100%;
      height: 100%;
    }

    .retry-image {
      font-size: 19.231rpx;
      padding: 0;
      border: 0;
      background: none;
      color: #586c5b;
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
      font-size: 25rpx;
      font-weight: 500;
      display: block;
      line-height: 1.7;
      margin: 9.615rpx 0;
      overflow-wrap: anywhere;
    }

    .scene-hint,
    .availability {
      display: block;
      color: #586c5b;
      font-size: 21.154rpx;
      line-height: 1.7;
      margin-top: 11.538rpx;
    }
  }

  .arrow {
    color: #ad4f32;
    font-size: 34.615rpx;
    flex-shrink: 0;
  }

  &.unavailable {
    opacity: 0.75;
  }

  &.featured {
    border: 1px solid #dfe5d8;
    border-radius: 25rpx;
    background: #fff;
    padding: 25rpx;
    gap: 28.846rpx;
    margin-bottom: 7.692rpx;
    min-height: 280.769rpx;

    .thumbnail {
      width: 151.923rpx;
      height: 228.846rpx;
      border-radius: 7.692rpx;
    }

    .arrow {
      align-self: flex-end;
      margin-bottom: 9.615rpx;
    }
  }

  &.compact {
    padding: 23.077rpx 0;
    gap: 21.154rpx;

    .thumbnail {
      width: 67.308rpx;
      height: 101.923rpx;
    }

    .scene-name {
      font-size: 21.154rpx;
    }

    .scene-hint,
    .availability {
      font-size: 19.231rpx;
    }
  }
}
</style>
