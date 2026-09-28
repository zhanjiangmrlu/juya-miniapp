<script setup lang="ts">
import AppButton from '@/components/app-button/app-button.vue'
import SurfaceCard from '@/components/surface-card/surface-card.vue'

import type { TodayTaskViewModel } from '@/features/home/home-presenter'

defineProps<{ task: TodayTaskViewModel | null }>()

const emit = defineEmits<{
  start: []
}>()

/** 将任务启动操作交给页面统一执行导航。 */
function handleStart() {
  emit('start')
}
</script>

<template>
  <SurfaceCard class="today-task-card" elevated tone="white">
    <template v-if="task">
      <text class="today-task-card__eyebrow">{{ task.eyebrow }}</text>
      <text class="today-task-card__title">{{ task.title }}</text>
      <text class="today-task-card__description">{{ task.description }}</text>
      <AppButton :label="task.buttonLabel" @press="handleStart" />
    </template>
    <template v-else>
      <text class="today-task-card__eyebrow">今日安排</text>
      <text class="today-task-card__title">连接后获取今日任务</text>
      <text class="today-task-card__description">学习记录只会在身份建立成功后生成。</text>
    </template>
  </SurfaceCard>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.today-task-card {
  padding: 32rpx;

  &__eyebrow,
  &__title,
  &__description {
    display: block;
  }

  &__eyebrow {
    color: tokens.$color-primary;
    font-size: 23rpx;
    font-weight: 700;
  }

  &__title {
    margin-top: 32rpx;
    font-family: Georgia, 'Noto Serif SC', serif;
    font-size: 36rpx;
    font-weight: 700;
  }

  &__description {
    margin: 24rpx 0 32rpx;
    font-size: 28rpx;
    line-height: 1.6;
  }
}
</style>
