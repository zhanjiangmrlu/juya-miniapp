<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import { mediaAddress } from '@/services/media-service'
import { openScene } from '@/services/navigation'

import type { SceneListItem } from '@/shared/types/learning'
const props = withDefaults(defineProps<{ card: SceneListItem; history?: boolean }>(), {
  history: false
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
  <view class="scene-row" :class="{ unavailable: !available }" @click="openScene(card.id)"
    ><view class="thumbnail"
      ><image
        v-if="src && !imageError"
        :src="src"
        mode="aspectFill"
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
      ><text v-else class="scene-hint">场景对话 · 重点词汇</text
      ><text v-if="completed" class="completed-badge">已完成</text><slot /></view
    ><text class="arrow">›</text></view
  >
</template>
<style scoped lang="scss">
.scene-row {
  display: flex;
  align-items: center;
  gap: 28rpx;
  width: 100%;
  border-bottom: 1px solid #e5e9de;
  padding: 28rpx 0;

  .thumbnail {
    width: 112rpx;
    height: 150rpx;
    flex-shrink: 0;
    border: 1px solid #dce2d5;
    border-radius: 10rpx;
    background: #eef3e9;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;

    image {
      width: 100%;
      height: 100%;
    }

    .retry-image {
      font-size: 20rpx;
      padding: 0;
      border: 0;
      background: none;
      color: #637268;
    }

    .image-placeholder {
      font-size: 20rpx;
      color: #91a08d;
    }
  }

  .scene-copy {
    flex: 1;
    min-width: 0;

    .scene-name {
      font-size: 32rpx;
      font-weight: 600;
      display: block;
      line-height: 1.6;
      overflow-wrap: anywhere;
    }

    .scene-hint,
    .availability {
      display: block;
      color: #637268;
      font-size: 22rpx;
      margin-top: 10rpx;
    }

    .completed-badge {
      display: inline-block;
      background: #eef3e9;
      color: #347553;
      font-size: 20rpx;
      padding: 2rpx 12rpx;
      border-radius: 8rpx;
      margin-top: 12rpx;
    }
  }

  .arrow {
    color: #637268;
    font-size: 40rpx;
  }

  .unavailable {
    opacity: 0.75;
  }
}
</style>
