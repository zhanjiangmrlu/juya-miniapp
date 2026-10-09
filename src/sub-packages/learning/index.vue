<script setup lang="ts">
import { onHide, onShow, onUnload } from '@dcloudio/uni-app'
import { computed } from 'vue'

import AppState from '@/components/app-state/app-state.vue'
import AccessNotice from '@/features/learning/components/access-notice.vue'
import EntryPageShell from '@/features/learning/components/entry-page-shell.vue'
import EntrySummary from '@/features/learning/components/entry-summary.vue'
import LearningPageHeading from '@/features/learning/components/learning-page-heading.vue'
import SceneListSection from '@/features/learning/components/scene-list-section.vue'
import { useLearningPage } from '@/features/learning/use-learning-page'
import { usePageScrollLock } from '@/shared/use-page-scroll-lock'
const {
  cancel,
  closeNotice,
  learning,
  load,
  noticeVisible,
  openExplore,
  openProfile,
  openReview,
  selectScene
} = useLearningPage()
const isNew = computed(() => learning.sections.stage === 'NEW')
const openTitles = computed(() =>
  learning.catalog.items
    .filter((scene) => scene.access === 'OPEN')
    .map((scene) => scene.chinese_title)
    .join(' · ')
)
/** 进入列表时读取最新的目录权限 */
const handleShow = () => {
  void load()
}
onShow(handleShow)
onHide(cancel)
onUnload(cancel)
const { pageStyle } = usePageScrollLock()
</script>
<template>
  <!-- #ifdef MP-WEIXIN -->
  <page-meta :page-style="pageStyle" />
  <!-- #endif -->
  <EntryPageShell active="learning">
    <LearningPageHeading
      eyebrow="从真实生活场景出发，轻松开口说英语。"
      title="场景学习"
      :large="!isNew"
    />
    <AppState
      v-if="learning.sections.authorizationPending"
      title="学习内容暂不可用"
      icon-label="权限确认中"
      description="正在重新确认你的内容权限，请稍后重试。"
    />
    <template v-else-if="isNew">
      <EntrySummary
        class="open-summary"
        label="开放学习"
        :value="`${learning.sections.openScenes.length} 个场景`"
        description="所有开放场景都可自由选择"
      />
      <SceneListSection
        title="开放场景"
        compact
        :scenes="learning.sections.openScenes"
        @select="selectScene"
      />
      <button class="primary-action" @click="openExplore">探索更多内容</button>
    </template>
    <template v-else>
      <SceneListSection
        title="继续学习"
        :scenes="learning.sections.currentLearning"
        @select="selectScene"
      />
      <SceneListSection
        class="entitled-section"
        title="已有学习权益"
        :scenes="learning.sections.entitledScenes"
        @select="selectScene"
      />
      <button
        v-if="learning.sections.openReview"
        class="entry-link review-link"
        @click="openReview"
      >
        <view
          ><text class="link-title">开放场景复习</text
          ><text class="link-copy">{{ openTitles || '查看已学习的开放场景' }}</text></view
        ><text class="link-arrow">›</text>
      </button>
      <button class="entry-link explore-link" @click="openExplore">
        <view
          ><text class="link-title">探索更多内容</text
          ><text class="link-copy">查看其他系列简介</text></view
        ><text class="link-arrow">›</text>
      </button>
    </template>
    <AccessNotice
      v-if="noticeVisible"
      :show-profile-action="learning.sections.showProfileAction"
      @close="closeNotice"
      @profile="openProfile"
    />
  </EntryPageShell>
</template>
<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.open-summary {
  margin-top: 23px;
}

.entitled-section {
  margin-top: 19px;
}

.primary-action {
  width: 100%;
  min-height: 46px;
  margin: auto 0 0;
  padding: 0 12px;
  border-radius: 12px;
  background: tokens.$color-primary;
  color: tokens.$color-white;
  font-size: 14px;
  line-height: 46px;
}

:deep(.scene-section.compact) {
  margin-bottom: 30px;
}

.entry-link {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: 17px 0 0;
  padding: 11px 15px;
  border: 1px solid tokens.$color-border;
  border-radius: 16px;
  background: tokens.$color-card;
  color: tokens.$color-text;
  text-align: left;
  line-height: normal;

  .link-title,
  .link-copy {
    display: block;
    overflow-wrap: anywhere;
  }

  .link-title {
    font-size: 16px;
    font-weight: 700;
    line-height: 25px;
  }

  .link-copy {
    margin-top: 1px;
    color: tokens.$color-text-muted;
    font-size: 12px;
    line-height: 23px;
  }

  .link-arrow {
    flex-shrink: 0;
    font-size: 24px;
    line-height: 30px;
  }

  &.review-link {
    min-height: 83px;
    margin-top: 22px;
    padding: 13px 16px;
    border: 0;
    background: tokens.$color-module;

    .link-copy {
      margin-top: 4px;
    }
  }

  &.explore-link {
    min-height: 70px;
  }
}
</style>
