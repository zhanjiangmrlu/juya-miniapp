<script setup lang="ts">
import { computed } from 'vue'

import arrow from '@/features/learning/assets/arrow.svg'
import book from '@/features/learning/assets/book.svg'
import lock from '@/features/learning/assets/lock.svg'

import type { SceneCardEmits, SceneCardProps } from '@/shared/types/learning-components'
const props = withDefaults(defineProps<SceneCardProps>(), {
  compact: false,
  actionLabel: '开始学习'
})
const emit = defineEmits<SceneCardEmits>()
/** 根据进度展示完成、学习中或已开通文案 */
const progressLabel = computed(() => {
  if (props.scene.progress >= 100) return '已完成 · 可复习'
  if (props.scene.progress > 0) return `学习中 · ${props.scene.progress}%`
  return '可学习 · 已开通'
})
/** 上抛当前卡片，让页面根据后台权限决定导航或提示 */
const handleSelect = () => emit('select', props.scene)
</script>
<template>
  <button
    class="scene-card"
    :class="{ compact, preview: !scene.canOpen }"
    :aria-label="`${scene.chineseTitle}，${scene.accessLabel}`"
    @click="handleSelect"
  >
    <image v-if="scene.imageUrl" class="cover" :src="scene.imageUrl" mode="aspectFill" />
    <view v-else class="cover placeholder" aria-hidden="true">
      <image
        v-if="scene.category === 'directions'"
        class="arrow-icon"
        :src="arrow"
        mode="aspectFit"
      />
      <image v-else class="book-icon" :src="book" mode="aspectFit" />
    </view>
    <view class="card-body">
      <view v-if="!compact" class="badge"
        ><text class="badge-label">{{ scene.canOpen ? scene.series : '内容预览' }}</text></view
      >
      <view class="title-row"
        ><text class="card-title">{{ scene.chineseTitle }}</text
        ><text v-if="compact" class="card-action">{{ actionLabel }}</text></view
      >
      <text class="card-subtitle">{{ scene.title }}{{ compact ? ` · ${scene.series}` : '' }}</text>
      <template v-if="!compact">
        <template v-if="scene.canOpen">
          <text class="status">{{ progressLabel }}</text>
          <view
            v-if="scene.progress > 0 && scene.progress < 100"
            class="progress"
            aria-hidden="true"
            ><view class="progress-value" :style="{ width: `${scene.progress}%` }"
          /></view>
        </template>
        <template v-else>
          <text class="description">{{ scene.description }}</text>
          <view class="locked"
            ><image class="lock-icon" :src="lock" mode="aspectFit" /><text class="locked-label"
              >当前未开通</text
            ></view
          >
        </template>
      </template>
      <text
        v-if="scene.tags?.some((tag) => !['内容预览', '开放学习场景'].includes(tag))"
        class="tags"
        >{{
          scene.tags.filter((tag) => !['内容预览', '开放学习场景'].includes(tag)).join(' · ')
        }}</text
      >
    </view>
  </button>
</template>
<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.scene-card {
  display: grid;
  width: 100%;
  min-height: 141px;
  align-items: start;
  grid-template-columns: 108px minmax(0, 1fr);
  gap: 12px;
  margin: 0;
  padding: 11px 19px 11px 11px;
  border: 1px solid tokens.$color-border;
  border-radius: 16px;
  background: tokens.$color-card;
  color: tokens.$color-text;
  text-align: left;
  line-height: normal;

  .cover {
    width: 108px;
    height: 117px;
    border-radius: 12px;
  }

  .placeholder {
    display: grid;
    place-items: center;
    background: #e5f2df;
  }

  .arrow-icon {
    width: 11.1333px;
    height: 20.4667px;
  }

  .book-icon {
    width: 25.8px;
    height: 24.68px;
  }

  .card-body {
    min-width: 0;
  }

  .badge {
    display: flex;
    width: fit-content;
    min-width: 72px;
    height: 24px;
    align-items: center;
    justify-content: center;
    padding: 0 12px;
    border-radius: 12px;
    background: tokens.$color-module;
    font-size: 11px;
  }

  .badge-label {
    transform: translateY(-4px);
  }

  .title-row {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 6px;
    margin-top: 6px;
  }

  .card-title {
    transform: translateY(-4px);
    font-size: 17px;
    font-weight: 700;
    line-height: 25px;
    overflow-wrap: anywhere;
  }

  .card-subtitle {
    transform: translateY(-4px);
    display: block;
    margin-top: 2px;
    color: tokens.$color-text-muted;
    font-size: 12px;
    line-height: 22px;
    overflow-wrap: anywhere;
  }

  .status {
    transform: translateY(-4px);
    display: block;
    margin-top: 6px;
    font-size: 11px;
    line-height: 20px;
  }

  .progress {
    height: 6px;
    margin-top: 2px;
    overflow: hidden;
    border-radius: 3px;
    background: tokens.$home-track;
  }

  .progress-value {
    height: 100%;
    border-radius: inherit;
    background: tokens.$home-progress;
  }

  .locked-label {
    transform: translateY(-4px);
  }

  .tags {
    display: block;
    margin-top: 4px;
    font-size: 10px;
    color: tokens.$color-text-muted;
  }

  &.compact {
    min-height: 91px;
    padding: 6px 9px;
    border-radius: 12px;
    grid-template-columns: 72px minmax(0, 1fr);

    .cover {
      width: 72px;
      height: 77px;
      border-radius: 11px;
    }

    .title-row {
      margin-top: 3px;
    }

    .card-title {
      font-size: 14px;
      line-height: 24px;
    }

    .card-action {
      flex-shrink: 0;
      margin-top: 1px;
      color: tokens.$color-primary;
      font-size: 10px;
      line-height: 23px;
    }

    .card-subtitle {
      margin-top: 5px;
      font-size: 11px;
      line-height: 19px;
    }
  }

  &.preview {
    min-height: 177px;
    padding: 11px;
    grid-template-columns: 126px minmax(0, 1fr);

    .cover {
      width: 126px;
      height: 153px;
    }

    .badge {
      min-width: 74px;
      margin-top: 3px;
    }

    .title-row {
      margin-top: 14px;
    }

    .card-title {
      font-size: 18px;
      line-height: 28px;
    }

    .card-subtitle {
      margin-top: 1px;
      line-height: 21px;
    }

    .description {
      transform: translateY(-4px);
      display: block;
      margin-top: 7px;
      font-size: 12px;
      line-height: 23px;
      overflow-wrap: anywhere;
    }

    .locked {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 9px;
      color: tokens.$color-text-muted;
      font-size: 11px;
      line-height: 23px;
    }

    .lock-icon {
      width: 16px;
      height: 16px;
    }
  }
}
</style>
