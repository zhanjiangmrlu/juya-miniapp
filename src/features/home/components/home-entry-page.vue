<script setup lang="ts">
import { onHide, onShow, onUnload } from '@dcloudio/uni-app'
import { computed, onBeforeUnmount } from 'vue'

import NetworkReconnectDialog from '@/components/network-reconnect-dialog/network-reconnect-dialog.vue'
import { resolveOpenSample } from '@/features/home/open-sample'
import { useHomePage } from '@/features/home/use-home-page'
import EntryPageShell from '@/features/learning/components/entry-page-shell.vue'
import EntrySummary from '@/features/learning/components/entry-summary.vue'
import LearningPageHeading from '@/features/learning/components/learning-page-heading.vue'
import SceneListSection from '@/features/learning/components/scene-list-section.vue'
import { AccessLevel } from '@/shared/enums/entitlements'
import { HomeEntryAction, HomeEntryMode } from '@/shared/enums/home'
import { NavigationType, TabKey } from '@/shared/enums/navigation'
import { navigate } from '@/shared/navigation/navigate'
import { useLearningStore } from '@/stores/learning'

import type { HomeEntryPageProps } from '@/shared/types/home-components'
const props = withDefaults(defineProps<HomeEntryPageProps>(), {
  embedded: false
})
const { cancel, canStartTask, home, load, openScene, startTask, taskScene } = useHomePage()
const sample = computed(() => (home.error ? null : resolveOpenSample(learning.catalog)))
const openScenes = computed(() =>
  learning.catalog.items.filter((scene) => scene.access === AccessLevel.OPEN)
)
const learning = useLearningStore()
const summaryValue = computed(() =>
  props.mode === HomeEntryMode.FIRST
    ? (sample.value?.text ?? '从真实场景开始练习')
    : taskScene.value
      ? `${taskScene.value.progress}%`
      : (home.view.todayTask?.title ?? '今日任务暂不可用')
)
const summaryDescription = computed(() =>
  props.mode === HomeEntryMode.FIRST
    ? sample.value
      ? `从「${sample.value.sceneTitle}」开始，让英语用在生活里。`
      : '选择一个开放场景，开始生活英语练习。'
    : taskScene.value
      ? taskScene.value.progress >= 50
        ? '已完成前半段对话'
        : '接着上次的位置继续学习'
      : (home.view.todayTask?.description ?? '重新连接后获取当前任务')
)
/** 刷新只读目录试学摘要，forceWechat 表示用户主动重新连接 */
const refresh = async (forceWechat = false) => {
  await load(forceWechat)
}
/** 显示页面时刷新实际任务及安全目录 */
const handleShow = () => {
  void refresh()
}
/** 重连成功后在原页面刷新试学内容 */
const handleRetry = async () => {
  await refresh(true)
}
/** 将步骤目标转换为真实导航，kind 为对话、跟读或收藏步骤 */
const openStep = async (kind: HomeEntryAction) => {
  if (kind === HomeEntryAction.FAVORITES) {
    await navigate({ type: NavigationType.RE_LAUNCH, url: '/sub-packages/favorites/index' })
    return
  }
  if (kind === HomeEntryAction.DIALOGUE) {
    await startTask()
    return
  }
  if (!taskScene.value) return
  await navigate({
    type: NavigationType.NAVIGATE_TO,
    url: `/sub-packages/scene/shadowing?sceneId=${encodeURIComponent(taskScene.value.sceneId)}`
  })
}
// 动态首页子组件共享父页刷新，不向页面根注册卸载后残留的生命周期
if (!props.embedded) {
  onShow(handleShow)
  onHide(cancel)
  onUnload(cancel)
}
onBeforeUnmount(cancel)
</script>
<template>
  <EntryPageShell :active="TabKey.HOME">
    <LearningPageHeading
      :title="mode === HomeEntryMode.FIRST ? '从真实场景开始' : '今日学习任务'"
      :eyebrow="
        mode === HomeEntryMode.FIRST
          ? `${openScenes.length} 个开放场景，随时开始练习`
          : '接着上次的位置，继续完成这一场景'
      "
    />
    <EntrySummary
      class="home-summary"
      :sentence="mode === HomeEntryMode.FIRST"
      :label="mode === HomeEntryMode.FIRST ? '先学一句' : (taskScene?.chineseTitle ?? '今日任务')"
      :value="summaryValue"
      :description="summaryDescription"
    />
    <SceneListSection
      v-if="mode === HomeEntryMode.FIRST"
      title="自由选择场景"
      compact
      card-action="可学习"
      :scenes="learning.sections.openScenes"
      @select="openScene"
    />
    <view v-else class="next-steps">
      <text class="steps-heading">下一步</text>
      <button
        class="step-card"
        :disabled="!canStartTask"
        @click="openStep(HomeEntryAction.DIALOGUE)"
      >
        <view class="step-heading"
          ><text>{{
            home.view.todayTask?.buttonLabel === '开始翻卡' ? '收藏翻卡复习' : '继续场景对话'
          }}</text
          ><text class="step-state">当前任务</text></view
        ><text class="step-copy">{{
          home.view.todayTask?.buttonLabel === '开始翻卡'
            ? '全部收藏均可翻卡，不限张数'
            : '从上次阅读位置继续'
        }}</text>
      </button>
      <button class="step-card" :disabled="!taskScene" @click="openStep(HomeEntryAction.SHADOWING)">
        <view class="step-heading"><text>逐句跟读</text><text class="step-state">练习</text></view
        ><text class="step-copy">可从任一句开始练习</text>
      </button>
      <button class="step-card" @click="openStep(HomeEntryAction.FAVORITES)">
        <view class="step-heading"
          ><text>完成后复习收藏</text><text class="step-state">下一步</text></view
        ><text class="step-copy">词汇与语块都可以翻卡，不限张数</text>
      </button>
    </view>
    <button class="home-primary" :disabled="!canStartTask" @click="startTask">
      {{
        mode === HomeEntryMode.FIRST ? '开始学习' : (home.view.todayTask?.buttonLabel ?? '继续学习')
      }}
    </button>
    <NetworkReconnectDialog v-if="home.error" @close="home.dismissError" @retry="handleRetry" />
  </EntryPageShell>
</template>
<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.home-summary {
  margin-top: 23px;
}

.home-primary {
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

:deep(.scene-section) {
  margin-bottom: 30px;
}

.next-steps {
  margin: 7px 0 30px;

  .steps-heading {
    display: block;
    font-size: 17px;
    font-weight: 700;
    line-height: 35px;
  }

  .step-card {
    width: 100%;
    min-height: 91px;
    margin: 0 0 10px;
    padding: 9px 13px;
    border: 1px solid tokens.$color-border;
    border-radius: 12px;
    background: tokens.$color-card;
    color: tokens.$color-text;
    text-align: left;
    line-height: normal;
  }

  .step-heading {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-size: 14px;
    font-weight: 700;
    line-height: 24px;
  }

  .step-state {
    color: tokens.$color-primary;
    font-size: 10px;
    font-weight: 500;
    line-height: 23px;
  }

  .step-copy {
    display: block;
    margin-top: 4px;
    color: #6b7d6a;
    font-size: 11px;
    line-height: 21px;
  }
}
</style>
