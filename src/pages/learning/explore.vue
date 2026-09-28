<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'

import AccessNotice from '@/features/learning/components/access-notice.vue'
import LearningPageHeading from '@/features/learning/components/learning-page-heading.vue'
import SceneListSection from '@/features/learning/components/scene-list-section.vue'
import { useLearningPage } from '@/features/learning/use-learning-page'
import TabPageLayout from '@/layouts/tab-page-layout.vue'

const { closeNotice, learning, load, noticeVisible, openProfile, selectScene } = useLearningPage()

/** 进入探索页时刷新预览列表，确保开放场景去重基于最新目录。 */
function handleShow() {
  void load()
}

onShow(handleShow)
</script>

<template>
  <TabPageLayout active="learning">
    <LearningPageHeading eyebrow="只读预览" title="探索更多内容" />
    <view class="explore-page__intro">
      <text class="explore-page__intro-title">了解主题与难度</text>
      <text class="explore-page__intro-copy">预览不包含正文、音频、收藏或跟读。</text>
    </view>
    <SceneListSection title="" :scenes="learning.sections.previewScenes" @select="selectScene" />
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

.explore-page {
  &__intro {
    margin: 28rpx 4rpx 0;
  }

  &__intro-title,
  &__intro-copy {
    display: block;
  }

  &__intro-title {
    font-size: 30rpx;
    font-weight: 700;
  }

  &__intro-copy {
    margin-top: 8rpx;
    color: tokens.$color-text-muted;
    font-size: 23rpx;
  }
}
</style>
