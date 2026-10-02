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
          <view class="series-tag"
            ><text class="series-label">{{ scene.series }}</text></view
          >
          <text class="scene-title">{{ scene.chineseTitle }}</text>
          <text class="english-title">{{ scene.title }}</text>
          <text class="progress-copy">{{ task.eyebrow }} · {{ scene.progress }}%</text>
        </view>
      </view>
      <view v-else class="task-fallback">
        <view class="series-tag"
          ><text class="series-label">{{ task.eyebrow }}</text></view
        >
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
      <button class="task-button" @click="handleStart">
        <text class="button-copy">{{ task.buttonLabel }}</text>
        <text class="button-arrow" aria-hidden="true">›</text>
      </button>
    </template>
    <view v-else class="task-fallback">
      <view class="series-tag"><text class="series-label">今日安排</text></view>
      <text class="scene-title">连接后获取今日任务</text>
      <text class="task-description">学习记录只会在身份建立成功后生成。</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.task-card {
  color: tokens.$home-ink;
  min-height: tokens.home-size(251);
  padding: tokens.home-size(13) tokens.home-size(13) tokens.home-size(27);
  border: tokens.home-size(1) solid tokens.$home-card-border;
  border-radius: tokens.home-size(16);
  background: tokens.$home-card;

  .task-scene {
    display: flex;
    align-items: flex-start;
    gap: tokens.home-size(12);
  }

  .scene-image {
    width: tokens.home-size(110);
    height: tokens.home-size(117);
    flex-shrink: 0;
    overflow: hidden;
    border-radius: tokens.home-size(12);
  }

  .image-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: tokens.$home-module;
    color: tokens.$home-muted;
    font-size: tokens.home-size(13);
  }

  .scene-copy {
    display: flex;
    min-width: 0;
    flex: 1;
    flex-direction: column;
  }

  .series-tag {
    display: inline-flex;
    min-height: tokens.home-size(24);
    align-items: center;
    justify-content: center;
    padding: 0 tokens.home-size(14);
    border-radius: tokens.home-size(12);
    background: tokens.$home-module;
    font-size: tokens.home-size(11);
    font-weight: 500;
    line-height: tokens.home-size(20);
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
    @include tokens.home-glyph;

    margin-top: tokens.home-size(8);
    font-size: tokens.home-size(20);
    font-weight: 700;
    line-height: tokens.home-size(32);
  }

  .english-title {
    @include tokens.home-glyph(5);

    margin-top: tokens.home-size(1);
    color: tokens.$home-muted;
    font-size: tokens.home-size(13);
    font-weight: 500;
    line-height: tokens.home-size(25);
  }

  .progress-copy {
    @include tokens.home-glyph(5);

    margin-top: tokens.home-size(5);
    font-size: tokens.home-size(12);
    font-weight: 500;
    line-height: tokens.home-size(22);
  }

  .progress-track {
    height: tokens.home-size(6);
    overflow: hidden;
    margin-top: tokens.home-size(14);
    border-radius: tokens.home-size(3);
    background: tokens.$home-track;
  }

  .progress-fill {
    height: tokens.home-size(6);
    border-radius: tokens.home-size(3);
    background: tokens.$home-progress;
  }

  .task-button {
    gap: tokens.home-size(10);
    display: flex;
    width: 100%;
    min-height: tokens.home-size(53);
    align-items: center;
    justify-content: center;
    margin-right: 0;
    margin-left: 0;
    margin-top: tokens.home-size(19);
    padding: 0 tokens.home-size(12);
    border: tokens.home-size(1) solid tokens.$home-border;
    border-radius: tokens.home-size(12);
    background: tokens.$home-primary;
    color: tokens.$color-white;
    font-size: tokens.home-size(15);
    font-weight: 700;
    line-height: tokens.home-size(28);

    &::after {
      border: 0;
    }
  }

  .task-fallback {
    min-height: tokens.home-size(136);
  }

  .task-description {
    @include tokens.home-glyph(5);

    margin-top: tokens.home-size(12);
    color: tokens.$home-muted;
    font-size: tokens.home-size(13);
    line-height: tokens.home-size(22);
  }

  .series-label,
  .button-copy,
  .button-arrow {
    @include tokens.home-glyph(3);
  }
}
</style>
