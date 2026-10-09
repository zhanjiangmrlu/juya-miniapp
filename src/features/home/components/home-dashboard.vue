<script setup lang="ts">
import HomeReviewCard from '@/features/home/components/home-review-card.vue'
import OpenSceneSummary from '@/features/home/components/open-scene-summary.vue'
import StreakCard from '@/features/home/components/streak-card.vue'
import TodayTaskCard from '@/features/home/components/today-task-card.vue'

import type { HomeDashboardEmits, HomeDashboardProps } from '@/shared/types/home-components'

withDefaults(defineProps<HomeDashboardProps>(), { canStartTask: true, taskScene: undefined })

const emit = defineEmits<HomeDashboardEmits>()

let contentTopInset: number | undefined
// #ifdef MP-WEIXIN
// 为真实系统状态栏和底部安全区预留空间，避免最后一张卡片被导航遮住
const windowInfo = uni.getWindowInfo()
const designScale = windowInfo.windowWidth / 390
const safeBottom =
  windowInfo.screenHeight - (windowInfo.safeArea?.bottom ?? windowInfo.screenHeight)
const footerHeight = 57 * designScale + Math.max(19 * designScale, safeBottom)
const contentOverflow = Math.max(
  0,
  (windowInfo.statusBarHeight ?? 20) + 719 * designScale + footerHeight - windowInfo.windowHeight
)
contentTopInset = Math.max(8 * designScale, 20 * designScale - contentOverflow)
// #endif

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
  <view
    class="home-dashboard"
    :style="contentTopInset === undefined ? undefined : { paddingTop: `${contentTopInset}px` }"
  >
    <text class="greeting">{{ view.salutation }}</text>
    <text class="subtitle">每天一点，让英语自然融入生活。</text>
    <StreakCard :checkins="view.checkins" />
    <text class="task-heading">今日学习任务</text>
    <TodayTaskCard
      :can-start="canStartTask"
      :scene="taskScene"
      :task="view.todayTask"
      @start="handleStartTask"
    />
    <HomeReviewCard @review="handleReview" />
    <OpenSceneSummary :count="openSceneCount" />
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.home-dashboard {
  color: tokens.$home-ink;
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  padding: tokens.home-size(20) tokens.home-size(20) 0;

  .greeting,
  .subtitle,
  .task-heading {
    display: block;
  }

  .greeting {
    @include tokens.home-glyph(5);

    font-size: tokens.home-size(28);
    font-weight: 700;
    line-height: tokens.home-size(42);
    overflow-wrap: anywhere;
  }

  .subtitle {
    @include tokens.home-glyph(5);

    color: tokens.$home-muted;
    font-size: tokens.home-size(13);
    line-height: tokens.home-size(25);
  }

  .task-heading {
    @include tokens.home-glyph;

    margin: tokens.home-size(16) 0 tokens.home-size(7);
    font-size: tokens.home-size(20);
    font-weight: 700;
    line-height: tokens.home-size(30);
  }
}
</style>
