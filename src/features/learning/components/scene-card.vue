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
/** 读取可复用的短期缩略图，失败后可单独更新凭证
 * @param renew 用户重试时是否重新签发图片地址
 */
const loadImage = async (renew = false) => {
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
      props.history,
      renew
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
  <view
    class="scene-row"
    :class="{ unavailable: !available, featured, compact }"
    @click="openScene(card.id)"
    ><view class="thumbnail"
      ><image
        v-if="src && !imageError"
        :src="src"
        mode="aspectFit"
        :webp="true"
        @error="imageError = true"
      /><button v-else-if="imageError" class="retry-image" @click.stop="loadImage(true)">
        重试图片</button
      ><text v-else class="image-placeholder">场景</text></view
    ><view class="scene-copy"
      ><text v-if="card.title_en" class="scene-english">{{ card.title_en }}</text
      ><text class="scene-name">{{ card.name }}</text
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
  min-height: 268.577rpx;
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
      font-family: Fraunces, Georgia, serif;
      font-size: 34.615rpx;
      font-weight: 400;
      line-height: 48.462rpx;
      letter-spacing: -0.015em;
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
