<script setup lang="ts">
import HomeReviewCard from '@/features/home/components/home-review-card.vue'
import OpenSceneSummary from '@/features/home/components/open-scene-summary.vue'
import StreakCard from '@/features/home/components/streak-card.vue'
import TodayTaskCard from '@/features/home/components/today-task-card.vue'

import type { HomeViewModel } from '@/features/home/home-presenter'
import type { SceneCardViewModel } from '@/features/learning/catalog-presenter'

defineProps<{
  openSceneCount: number | null
  taskScene?: SceneCardViewModel
  view: HomeViewModel
}>()

const emit = defineEmits<{ startTask: []; openReview: [] }>()

/** 启动首页今日任务。 */
function handleStartTask() {
  emit('startTask')
}

/** 打开词汇银行和语块银行的复习入口。 */
function handleReview() {
  emit('openReview')
}
</script>

<template>
  <view class="home-dashboard">
    <text class="greeting">{{ view.salutation }}</text>
    <text class="subtitle">每天一点，让英语自然融入生活。</text>
    <StreakCard :checkins="view.checkins" />
    <text class="task-heading">今日学习任务</text>
    <TodayTaskCard :scene="taskScene" :task="view.todayTask" @start="handleStartTask" />
    <HomeReviewCard @review="handleReview" />
    <OpenSceneSummary :count="openSceneCount" />
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.home-dashboard {
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  padding: 20px 20px 0;

  .greeting,
  .subtitle,
  .task-heading {
    display: block;
  }

  .greeting {
    font-size: 28px;
    font-weight: 700;
    line-height: 42px;
    overflow-wrap: anywhere;
  }

  .subtitle {
    color: tokens.$home-muted;
    font-size: 13px;
    line-height: 25px;
  }

  .task-heading {
    margin: 16px 0 7px;
    font-size: 20px;
    font-weight: 700;
    line-height: 30px;
  }

  @media (width <= 375px) {
    padding-top: 16px;

    .task-heading {
      margin-top: 12px;
    }
  }
}
</style>
