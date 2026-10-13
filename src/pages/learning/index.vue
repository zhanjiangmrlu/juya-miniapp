<script setup lang="ts">
import { onHide, onShow, onUnload } from '@dcloudio/uni-app'
import { computed } from 'vue'

import AppState from '@/components/app-state/app-state.vue'
import AccessNotice from '@/features/learning/components/access-notice.vue'
import EntryPageShell from '@/features/learning/components/entry-page-shell.vue'
import LearningPageHeading from '@/features/learning/components/learning-page-heading.vue'
import SceneListSection from '@/features/learning/components/scene-list-section.vue'
import { useLearningPage } from '@/features/learning/use-learning-page'
import { useAnalyticsPage } from '@/services/analytics/use-analytics-page'
import { AccessLevel } from '@/shared/enums/entitlements'
import { LearningCatalogStage } from '@/shared/enums/learning'
import { TabKey } from '@/shared/enums/navigation'
import { usePageScrollLock } from '@/shared/use-page-scroll-lock'
const {
  cancel,
  closeNotice,
  learning,
  load,
  noticeVisible,
  openExplore,
  openFavorites,
  openProfile,
  openReview,
  selectScene,
  selectModule,
  profileActionShown
} = useLearningPage()
const isNew = computed(() => learning.sections.stage === LearningCatalogStage.NEW)
/** 仅在服务端启用场景模块时展示其内容及空状态 */
const hasSceneModule = computed(() =>
  learning.sections.modules.some((module) => module.key === 'scene_learning')
)
/** 目录中可学或可复习的场景存在时保留原有学习分区 */
const hasLearningScenes = computed(
  () =>
    learning.sections.openScenes.length +
      learning.sections.currentLearning.length +
      learning.sections.entitledScenes.length +
      (learning.sections.openReview?.totalCount ?? 0) >
    0
)
const openTitles = computed(() =>
  learning.catalog.items
    .filter((scene) => scene.access === AccessLevel.OPEN)
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
useAnalyticsPage('pages/learning/index')
</script>
<template>
  <!-- #ifdef MP-WEIXIN -->
  <page-meta :page-style="pageStyle" />
  <!-- #endif -->
  <EntryPageShell :active="TabKey.LEARNING">
    <LearningPageHeading
      eyebrow="从真实生活场景出发，轻松开口说英语。"
      title="场景学习"
      :large="!isNew"
    />
    <view v-if="learning.sections.modules.length" class="learning-modules"
      ><button
        v-for="module in learning.sections.modules"
        :key="module.public_id"
        :class="{ selected: module.key === 'scene_learning' }"
        @click="selectModule(module)"
      >
        {{ module.title }}
      </button></view
    >
    <AppState
      v-if="learning.loading"
      title="正在加载学习内容"
      icon-label="加载中"
      description="请稍候。"
    />
    <AppState
      v-else-if="learning.error"
      title="学习内容暂不可用"
      icon-label="网络异常"
      description="请检查网络后重试。"
      ><button class="primary-action" @click="load">重新加载</button></AppState
    >
    <AppState
      v-else-if="learning.sections.authorizationPending"
      title="学习内容暂不可用"
      icon-label="权限确认中"
      description="正在重新确认你的内容权限，请稍后重试。"
    />
    <AppState
      v-else-if="!learning.sections.modules.length"
      title="学习内容正在调整，请稍后再来。"
      icon-label="暂无内容"
      description="你仍可查看收藏与学习档案。"
      ><button class="primary-action" @click="openFavorites">前往收藏</button></AppState
    >
    <AppState
      v-else-if="hasSceneModule && !hasLearningScenes"
      title="暂无可学习的场景"
      icon-label="暂无场景"
      description="可先探索其他内容，或稍后再来。"
      ><button class="primary-action" @click="openExplore">探索更多内容</button></AppState
    >
    <template v-else-if="isNew && hasSceneModule">
      <SceneListSection
        title="开放场景"
        compact
        :scenes="learning.sections.openScenes"
        @select="selectScene"
      />
      <button class="primary-action" @click="openExplore">探索更多内容</button>
    </template>
    <template v-else-if="hasSceneModule">
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
      :show-profile-action="learning.sections.showProfileAction && !profileActionShown"
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

.learning-modules {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;

  button {
    flex: 1;
    min-width: 100px;
    min-height: 44px;
    margin: 0;
    padding: 8px 12px;
    border-radius: 12px;
    background: #e2eed9;
    color: #254733;
    font-size: 15px;
    line-height: 24px;

    &.selected {
      background: #4e7f3b;
      color: #fff;
    }
  }
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
