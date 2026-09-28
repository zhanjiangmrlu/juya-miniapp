<script setup lang="ts">
import StreakCard from '@/features/home/components/streak-card.vue'
import TodayTaskCard from '@/features/home/components/today-task-card.vue'
import SceneCard from '@/features/learning/components/scene-card.vue'

import type { HomeViewModel } from '@/features/home/home-presenter'
import type { SceneCardViewModel } from '@/features/learning/catalog-presenter'

defineProps<{
  featuredScene?: SceneCardViewModel
  view: HomeViewModel
}>()

const emit = defineEmits<{
  openScene: [scene: SceneCardViewModel]
  startTask: []
}>()

/** 启动首页今日任务。 */
function handleStartTask() {
  emit('startTask')
}

/** 打开首页推荐的开放学习场景。 */
function handleScene(scene: SceneCardViewModel) {
  emit('openScene', scene)
}
</script>

<template>
  <view class="home-dashboard">
    <view class="home-dashboard__heading">
      <view>
        <text class="home-dashboard__date">{{ view.dateLabel }}</text>
        <text class="home-dashboard__salutation">{{ view.salutation }}</text>
      </view>
      <view class="home-dashboard__message" aria-label="站内消息">
        <view class="home-dashboard__message-mark" />
        <text v-if="view.unreadMessageCount" class="home-dashboard__unread">
          {{ view.unreadMessageCount > 99 ? '99+' : view.unreadMessageCount }}
        </text>
      </view>
    </view>

    <StreakCard :checkins="view.checkins" />

    <view class="home-dashboard__section-heading">
      <text class="home-dashboard__section-title">今日任务</text>
      <text class="home-dashboard__duration">约 8 分钟</text>
    </view>
    <TodayTaskCard :task="view.todayTask" @start="handleStartTask" />

    <SceneCard
      v-if="featuredScene"
      class="home-dashboard__featured"
      compact
      :scene="featuredScene"
      @select="handleScene"
    />
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.home-dashboard {
  &__heading,
  &__section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__date,
  &__salutation {
    display: block;
  }

  &__date {
    color: tokens.$color-primary-strong;
    font-size: 23rpx;
    font-weight: 650;
  }

  &__salutation {
    margin-top: 8rpx;
    font-family: Georgia, 'Noto Serif SC', serif;
    font-size: 48rpx;
    font-weight: 700;
    line-height: 1.2;
  }

  &__message {
    position: relative;
    display: grid;
    width: 76rpx;
    height: 76rpx;
    place-items: center;
    border-radius: 50%;
    background: rgb(255 255 255 / 78%);
  }

  &__message-mark {
    width: 20rpx;
    height: 20rpx;
    border: 4rpx solid tokens.$color-primary;
    transform: rotate(45deg);
  }

  &__unread {
    position: absolute;
    top: -4rpx;
    right: -2rpx;
    min-width: 24rpx;
    height: 24rpx;
    padding: 0 6rpx;
    border: 3rpx solid tokens.$color-white;
    border-radius: tokens.$radius-pill;
    background: tokens.$color-danger;
    color: tokens.$color-white;
    font-size: 16rpx;
    line-height: 20rpx;
    text-align: center;
  }

  &__section-heading {
    margin: 36rpx 4rpx 16rpx;
  }

  &__section-title {
    font-size: 34rpx;
    font-weight: 700;
  }

  &__duration {
    color: tokens.$color-primary-strong;
    font-size: 24rpx;
  }

  &__featured {
    margin-top: 24rpx;
  }
}
</style>
