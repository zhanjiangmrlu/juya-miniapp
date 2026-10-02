<script setup lang="ts">
import { computed } from 'vue'

import type { TodayTaskViewModel } from '@/features/home/home-presenter'
import type { SceneCardViewModel } from '@/features/learning/catalog-presenter'

const props = defineProps<{ scene?: SceneCardViewModel; task: TodayTaskViewModel | null }>()

const emit = defineEmits<{ start: [] }>()
const imageUrl = computed(() => {
  if (props.scene?.imageUrl) return props.scene.imageUrl
  return props.scene?.title === 'At the Coffee Shop' ? '/static/home/coffee-home.png' : undefined
})

/** 将任务启动操作交给页面统一执行导航 */
const handleStart = () => {
  emit('start')
}
</script>

<template>
  <view class="task-card">
    <template v-if="task">
      <view v-if="scene" class="task-scene">
        <image
          v-if="imageUrl"
          class="scene-image"
          :src="imageUrl"
          :aria-label="scene.chineseTitle"
          mode="aspectFill"
        />
        <view v-else class="scene-image image-placeholder">
          <text>{{ scene.series }}</text>
        </view>
        <view class="scene-copy">
          <text class="series-tag">{{ scene.series }}</text>
          <text class="scene-title">{{ scene.chineseTitle }}</text>
          <text class="english-title">{{ scene.title }}</text>
          <text class="progress-copy">{{ task.eyebrow }} · {{ scene.progress }}%</text>
        </view>
      </view>
      <view v-else class="task-fallback">
        <text class="series-tag">{{ task.eyebrow }}</text>
        <text class="scene-title">{{ task.title }}</text>
        <text class="task-description">{{ task.description }}</text>
      </view>
      <view
        v-if="scene"
        class="progress-track"
        role="progressbar"
        aria-label="学习进度"
        :aria-valuenow="scene.progress"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <view class="progress-fill" :style="{ width: `${scene.progress}%` }" />
      </view>
      <button class="task-button" @click="handleStart">{{ task.buttonLabel }} ›</button>
    </template>
    <view v-else class="task-fallback">
      <text class="series-tag">今日安排</text>
      <text class="scene-title">连接后获取今日任务</text>
      <text class="task-description">学习记录只会在身份建立成功后生成。</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.task-card {
  min-height: 251px;
  padding: 13px 13px 27px;
  border: 1px solid tokens.$home-card-border;
  border-radius: 16px;
  background: tokens.$home-card;

  .task-scene {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  .scene-image {
    width: 110px;
    height: 117px;
    flex-shrink: 0;
    overflow: hidden;
    border-radius: 12px;
  }

  .image-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: tokens.$home-module;
    color: tokens.$home-muted;
    font-size: 13px;
  }

  .scene-copy {
    display: flex;
    min-width: 0;
    flex: 1;
    flex-direction: column;
  }

  .series-tag {
    display: inline-flex;
    min-height: 24px;
    align-items: center;
    justify-content: center;
    padding: 0 14px;
    border-radius: 12px;
    background: tokens.$home-module;
    font-size: 11px;
    font-weight: 500;
    line-height: 20px;
    align-self: flex-start;
  }

  .scene-title,
  .english-title,
  .progress-copy,
  .task-description {
    display: block;
    overflow-wrap: anywhere;
  }

  .scene-title {
    margin-top: 8px;
    font-size: 20px;
    font-weight: 700;
    line-height: 32px;
  }

  .english-title {
    margin-top: 1px;
    color: tokens.$home-muted;
    font-size: 13px;
    font-weight: 500;
    line-height: 25px;
  }

  .progress-copy {
    margin-top: 5px;
    font-size: 12px;
    font-weight: 500;
    line-height: 22px;
  }

  @media (width <= 375px) {
    min-height: 247px;
    padding-bottom: 23px;
  }

  .progress-track {
    height: 6px;
    overflow: hidden;
    margin-top: 14px;
    border-radius: 3px;
    background: tokens.$home-track;
  }

  .progress-fill {
    height: 6px;
    border-radius: 3px;
    background: tokens.$home-progress;
  }

  .task-button {
    display: flex;
    width: 100%;
    min-height: 53px;
    align-items: center;
    justify-content: center;
    margin-right: 0;
    margin-left: 0;
    margin-top: 19px;
    padding: 0 12px;
    border: 1px solid tokens.$home-border;
    border-radius: 12px;
    background: tokens.$home-primary;
    color: tokens.$color-white;
    font-size: 15px;
    font-weight: 700;
    line-height: 28px;

    &::after {
      border: 0;
    }
  }

  .task-fallback {
    min-height: 136px;
  }

  .task-description {
    margin-top: 12px;
    color: tokens.$home-muted;
    font-size: 13px;
    line-height: 22px;
  }
}
</style>
