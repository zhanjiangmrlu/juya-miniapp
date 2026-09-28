<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'

import AppState from '@/components/app-state/app-state.vue'
import SurfaceCard from '@/components/surface-card/surface-card.vue'
import AccessNotice from '@/features/learning/components/access-notice.vue'
import LearningPageHeading from '@/features/learning/components/learning-page-heading.vue'
import SceneListSection from '@/features/learning/components/scene-list-section.vue'
import { useLearningPage } from '@/features/learning/use-learning-page'
import TabPageLayout from '@/layouts/tab-page-layout.vue'

const {
  closeNotice,
  learning,
  load,
  noticeVisible,
  openExplore,
  openProfile,
  openReview,
  selectScene
} = useLearningPage()

/** 每次回到学习页时刷新目录，以服务端最新权益状态为准。 */
function handleShow() {
  void load()
}

onShow(handleShow)
</script>

<template>
  <TabPageLayout active="learning">
    <LearningPageHeading eyebrow="真实场景 · 自然表达" title="开始学习" />

    <SurfaceCard
      v-for="module in learning.sections.modules"
      :key="module.public_id"
      class="learning-page__module"
      tone="module"
    >
      <view>
        <text class="learning-page__module-label">学习模块</text>
        <text class="learning-page__module-title">{{ module.title }}</text>
      </view>
      <text class="learning-page__module-key">{{ module.key }}</text>
    </SurfaceCard>

    <AppState
      v-if="learning.sections.authorizationPending"
      description="正在重新确认你的内容权限，请稍后重试。"
      icon-label="权限确认中"
      title="学习内容暂不可用"
    />

    <SceneListSection
      title="当前学习"
      action-label="继续上次进度"
      :scenes="learning.sections.currentLearning"
      @select="selectScene"
    />
    <SceneListSection
      title="开放学习场景"
      :action-label="`${learning.sections.openScenes.length}/3`"
      :scenes="learning.sections.openScenes"
      @select="selectScene"
    />
    <SceneListSection
      title="已有权益内容"
      action-label="查看权益"
      :scenes="learning.sections.entitledScenes"
      @select="selectScene"
    />

    <button v-if="learning.sections.openReview" class="learning-page__review" @click="openReview">
      <view>
        <text class="learning-page__review-title">开放场景复习</text>
        <text class="learning-page__review-description">
          {{ learning.sections.openReview.completedCount }} 个场景可随时复习
        </text>
      </view>
      <text class="learning-page__review-action">进入</text>
    </button>

    <button
      v-if="learning.sections.previewScenes.length > 0"
      class="learning-page__explore"
      @click="openExplore"
    >
      <text class="learning-page__explore-title">探索更多内容</text>
      <text class="learning-page__explore-action">只读预览</text>
    </button>

    <AccessNotice
      v-if="noticeVisible"
      :show-profile-action="learning.sections.showProfileAction"
      @close="closeNotice"
      @profile="openProfile"
    />
  </TabPageLayout>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.learning-page {
  &__module {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 28rpx;
    padding: 24rpx;
  }

  &__module-label,
  &__module-title {
    display: block;
  }

  &__module-label {
    color: tokens.$color-text-muted;
    font-size: 21rpx;
  }

  &__module-title {
    margin-top: 8rpx;
    font-size: 30rpx;
    font-weight: 700;
  }

  &__module-key {
    padding: 10rpx 16rpx;
    border-radius: tokens.$radius-pill;
    background: rgb(255 255 255 / 45%);
    color: tokens.$color-primary-strong;
    font-size: 20rpx;
    font-weight: 700;
  }

  &__review,
  &__explore {
    display: flex;
    width: 100%;
    min-height: 108rpx;
    align-items: center;
    justify-content: space-between;
    margin: 24rpx 0 0;
    padding: 24rpx 28rpx;
    border: 2rpx solid tokens.$color-border;
    border-radius: tokens.$radius-medium;
    background: rgb(255 255 255 / 66%);
    color: tokens.$color-text;
    text-align: left;
  }

  &__review-title,
  &__review-description {
    display: block;
  }

  &__review-title,
  &__explore-title {
    font-size: 30rpx;
    font-weight: 700;
  }

  &__review-description {
    margin-top: 6rpx;
    color: tokens.$color-text-muted;
    font-size: 21rpx;
  }

  &__review-action,
  &__explore-action {
    color: tokens.$color-primary;
    font-size: 24rpx;
    font-weight: 650;
  }
}
</style>
