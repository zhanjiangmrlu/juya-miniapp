<script setup lang="ts">
import {
  onHide,
  onLoad,
  onShareAppMessage,
  onShareTimeline,
  onShow,
  onUnload
} from '@dcloudio/uni-app'
import { computed, ref, watch } from 'vue'

import AppPage from '@/components/app-page/app-page.vue'
import AppState from '@/components/app-state/app-state.vue'
import { useListPosition } from '@/composables/use-list-position'
import { useNativeShare } from '@/composables/use-native-share'
import { useSceneList } from '@/composables/use-scene-list'
import SceneCard from '@/features/learning/components/scene-card.vue'
import SceneListFooter from '@/features/learning/components/scene-list-footer.vue'
import ShareSummary from '@/features/share/components/share-summary.vue'
import { onSessionExpired, session } from '@/services/api'
import { feedbackInbox } from '@/services/feedback-service'
import { listPageSize } from '@/services/list-page-size'
import { runtimeMode } from '@/services/runtime-mode'
import { homeShare } from '@/services/share-service'
import { Routes } from '@/shared/constants/navigation'
import { LearningTab, QueueSource } from '@/shared/enums/learning'
import { LearningAuthorizationStatus } from '@/shared/enums/learning-access'
import { PageBackgroundKind } from '@/shared/enums/ui'
import { useAccountStore } from '@/stores/account-store'

import type { CardBrief } from '@/shared/types/learning'
const account = useAccountStore(),
  statsError = ref(''),
  scrollTop = ref(0),
  refreshing = ref(false)
const browseOnly = runtimeMode.browseOnly,
  accessReady = ref(!browseOnly.value),
  share = useNativeShare()
// 原生分享属于编译期可选生命周期，必须直接在页面声明
onShareAppMessage(() => ({ ...homeShare.friends }))
onShareTimeline(() => ({ ...homeShare.timeline }))
let listOwner = session.userId(),
  sharedEntry = false,
  requiresIdentityCheck = browseOnly.value
const activeTab = ref<LearningTab>(LearningTab.ALL)
/** 为每个分区建立独立可信快照与服务端分页
 * @param path 当前分区的服务端集合查询
 */
const createList = (path: string) =>
  useSceneList<CardBrief>({
    path,
    pageSize: () => listPageSize(268.577, 1050),
    request: session.request,
    userId: session.userId,
    ensure: () => account.ensure(Routes.LEARNING)
  })
const lists = {
  [LearningTab.ALL]: createList('/api/mini/v1/cards'),
  [LearningTab.NOTES]: createList('/api/mini/v1/cards?scope=published&has_study_note=true')
}
const currentList = computed(() => lists[activeTab.value]),
  cards = computed(() => currentList.value.items.value),
  total = computed(() => currentList.value.total.value),
  publishedTotal = computed(() => currentList.value.publishedTotal.value),
  accessContext = computed(
    () =>
      currentList.value.accessContext.value ||
      lists[LearningTab.ALL].accessContext.value ||
      lists[LearningTab.NOTES].accessContext.value
  ),
  freeRemaining = computed(() => currentList.value.freeRemaining.value),
  busy = computed(() => currentList.value.busy.value),
  moreBusy = computed(() => currentList.value.moreBusy.value),
  error = computed(() => currentList.value.error.value),
  moreError = computed(() => currentList.value.moreError.value),
  hasMore = computed(() => currentList.value.hasMore.value),
  done = computed(() => currentList.value.done.value),
  notes = computed(() => activeTab.value === LearningTab.NOTES)
/** 刷新当前分区已经读取的范围 */
const refreshList = () => {
  syncOwner()
  return currentList.value.refresh()
}
/** 主动重读当前分区的第一页 */
const restartList = () => {
  syncOwner()
  return currentList.value.restart()
}
/** 追加当前分区下一有效页 */
const loadMore = () => {
  syncOwner()
  return currentList.value.more()
}
/** 销毁两个分区的在途响应 */
const dispose = () => Object.values(lists).forEach((list) => list.dispose())
/** 账号变化时同时清理两个分区的快照 */
const resetList = () => Object.values(lists).forEach((list) => list.reset())
const authorizationLabel = computed(() => {
  if (!accessContext.value) return '权限准备中'
  return accessContext.value.authorization.status === LearningAuthorizationStatus.ACTIVE
    ? '授权有效'
    : accessContext.value.authorization.status === LearningAuthorizationStatus.EXPIRED
      ? '授权已到期'
      : '未授权'
})
/** 将阅读位置恢复到场景列表容器
 * @param top 列表距离顶部的像素距离
 */
const restoreScroll = (top: number) => {
  scrollTop.value = top
}
const positions = {
  [LearningTab.ALL]: useListPosition(session.userId, restoreScroll),
  [LearningTab.NOTES]: useListPosition(session.userId, restoreScroll)
}
const position = {
  scroll: (top: number) => positions[activeTab.value].scroll(top),
  reset: () => Object.values(positions).forEach((value) => value.reset()),
  dispose: () => Object.values(positions).forEach((value) => value.dispose()),
  preserve: (task: () => Promise<void>) => positions[activeTab.value].preserve(task)
}
/** 用户主动切换分区时清除该分区位置，数据和错误仍独立保留
 * @param tab 用户选择的场景分区
 */
const selectTab = async (tab: LearningTab) => {
  syncOwner()
  if (tab === activeTab.value || runtimeMode.update()) return
  position.dispose()
  activeTab.value = tab
  positions[tab].reset()
  scrollTop.value = 0
  await lists[tab].refresh()
}
/** 记录列表滚动位置供详情返回时恢复
 * @param event 列表容器的滚动事件
 */
const onListScroll = (event: { detail: { scrollTop: number } }) => {
  scrollTop.value = event.detail.scrollTop
  position.scroll(event.detail.scrollTop)
}
/** 保留详情返回前的滚动位置和已读页 */
const refresh = () => position.preserve(refreshList)
/** 主动下拉成功后清除旧阅读位置，新轮次失败仍保留可信内容 */
const restart = async () => {
  const owner = session.userId()
  await restartList()
  if (owner === session.userId() && !error.value) {
    position.reset()
    scrollTop.value = 0
  }
}
/** 账号切换同时清除上一账号的列表和位置 */
const reset = () => {
  listOwner = session.userId()
  resetList()
  position.reset()
  scrollTop.value = 0
}
/** 任一账号边界先清理两栏，禁止新账号回退到另一栏的旧授权或位置 */
const syncOwner = () => {
  if (listOwner !== session.userId()) reset()
}
watch(() => account.profile?.id, syncOwner, { flush: 'sync' })
const unsubscribe = onSessionExpired(reset)
/** 统计单独失败时仍允许查看场景卡片 */
const refreshStats = async () => {
  if (runtimeMode.update()) return
  statsError.value = ''
  try {
    if (await account.ensure(Routes.LEARNING)) {
      await account.refreshStatistics()
      await account.refreshAvatar()
    }
  } catch (reason) {
    statsError.value = reason instanceof Error ? reason.message : '学习统计暂未获取'
  }
}
/** 打开账号只读资料页 */
const profile = () => uni.switchTab({ url: Routes.PROFILE })
/** 从显式记录入口打开最近使用的标签 */
const records = () => uni.switchTab({ url: Routes.RECORDS })
/** 当前场景全部学完后仍可从收藏选择复习 */
const favorites = () => uni.navigateTo({ url: Routes.FAVORITES })
/** 分享进入时先重验本人会话，再读取私人列表和统计 */
const showPage = async () => {
  if (runtimeMode.update()) return
  syncOwner()
  // H5 直接刷新路由时可能尚未建立原生底栏，使用回调处理该状态
  uni.hideTabBar({ animation: false, fail: () => undefined })
  if (sharedEntry || requiresIdentityCheck) {
    try {
      if (
        !(await account.ensure(`${Routes.LEARNING}?target=learning`)) ||
        !(await account.restore())
      )
        return
    } catch (reason) {
      statsError.value = reason instanceof Error ? reason.message : '会话暂未确认，请重试'
      return
    }
  }
  if (runtimeMode.update()) return
  try {
    if (!(await account.ensure(notes.value ? `${Routes.LEARNING}?tab=notes` : Routes.LEARNING)))
      return
  } catch (reason) {
    statsError.value = reason instanceof Error ? reason.message : '会话暂未确认，请重试'
    return
  }
  syncOwner()
  requiresIdentityCheck = false
  await Promise.allSettled([refresh(), refreshStats(), feedbackInbox.refresh()])
  if (!runtimeMode.update()) accessReady.value = true
}
onShow(showPage)
onLoad((query) => {
  activeTab.value = query?.tab === LearningTab.NOTES ? LearningTab.NOTES : LearningTab.ALL
  sharedEntry = query?.target === 'learning'
  if (sharedEntry) accessReady.value = false
})
watch(
  browseOnly,
  (restricted) => {
    share.hide()
    if (restricted) {
      accessReady.value = false
      requiresIdentityCheck = true
      reset()
    }
    if (!restricted) void showPage()
  },
  { flush: 'sync' }
)
onHide(() => {
  share.hide()
  position.dispose()
})
/** 在列表内下拉刷新场景及统计，结束后收起刷新提示 */
const pullRefresh = async () => {
  if (runtimeMode.update() || refreshing.value) return
  refreshing.value = true
  try {
    await Promise.allSettled([restart(), refreshStats()])
  } finally {
    refreshing.value = false
  }
}
/** 列表触底时追加下一页 */
const more = () => {
  if (!runtimeMode.update()) void loadMore()
}
onUnload(() => {
  dispose()
  position.dispose()
  unsubscribe()
})
</script>
<template>
  <AppPage
    :background-kind="PageBackgroundKind.SCENE"
    fixed-viewport
    title="场景学习"
    back
    public-summary
    :shareable="!browseOnly && Boolean(account.profile)"
  >
    <ShareSummary v-if="browseOnly" />
    <AppState v-else-if="!accessReady" :busy="!statsError" :error="statsError" @retry="showPage" />
    <template v-else>
      <view class="list-header">
        <text class="home-title">English, every day.</text>
        <text class="learner-status"
          >{{ account.profile?.nickname || '学习者' }} · {{ authorizationLabel }} ·
          {{
            account.statistics
              ? account.statistics.checked_in_today
                ? '今日已打卡'
                : '今日待打卡'
              : '打卡状态准备中'
          }}</text
        >
        <view class="scene-summary">
          <button v-if="account.statistics" class="summary-link learned-link" @click="records">
            已学 {{ account.statistics.completed_cards }} 张场景卡
          </button>
          <button class="summary-link records-entry" @click="records">
            学习记录<image
              class="summary-chevron"
              src="/static/design/scene-row-chevron.svg"
              mode="aspectFit"
            />
          </button>
          <button class="summary-link account-link" @click="profile">
            账号<text
              v-if="feedbackInbox.value.value.unread"
              class="feedback-dot"
              aria-label="有未读反馈回复"
            />
            <image
              class="summary-chevron"
              src="/static/design/scene-row-chevron.svg"
              mode="aspectFit"
            />
          </button>
        </view>
        <view v-if="account.statistics" class="scene-streak">
          <text>连续打卡 {{ account.statistics.current_streak }} 天</text>
          <text>累计打卡 {{ account.statistics.total_checkin_days }} 天</text>
        </view>
        <AppState
          v-else
          :busy="!statsError"
          :error="statsError && '统计暂未获取'"
          @retry="refreshStats"
        />
        <view v-if="statsError && account.statistics" class="notice error"
          >统计暂未更新<button class="text-button" @click="refreshStats">重试</button></view
        >
        <view class="catalog-tabs" role="tablist" aria-label="场景列表分区">
          <button
            v-for="tab in [LearningTab.ALL, LearningTab.NOTES]"
            :key="tab"
            role="tab"
            :data-tab="tab"
            :aria-selected="activeTab === tab"
            :class="{ selected: activeTab === tab }"
            @click="selectTab(tab)"
          >
            {{ tab === LearningTab.ALL ? '全部场景' : '含学习笔记' }}
          </button>
        </view>
        <view class="catalog-heading between">
          <text class="section-title">{{ notes ? '含学习笔记' : '待学场景' }}</text>
          <text v-if="total !== null" class="catalog-count">{{ total }} 张</text>
        </view>
        <view
          v-if="
            !notes &&
            accessContext?.enabled &&
            accessContext.authorization.status !== LearningAuthorizationStatus.ACTIVE
          "
          class="access-notice"
          >{{
            freeRemaining === 0 && total
              ? '当前免费场景已学完'
              : accessContext.free_count === 0
                ? '当前暂无免费开放场景'
                : `免费开放 ${accessContext.free_count} 张，其余场景需学习授权`
          }}</view
        >
      </view>
      <scroll-view
        class="scene-scroll"
        scroll-y
        enhanced
        :show-scrollbar="false"
        :scroll-top="scrollTop"
        refresher-enabled
        :refresher-triggered="refreshing"
        refresher-background="transparent"
        @scroll="onListScroll"
        @scrolltolower="more"
        @refresherrefresh="pullRefresh"
      >
        <AppState
          :class="{ 'notes-state': notes }"
          :icon="notes ? '/static/design/study-note-empty.svg' : undefined"
          :busy="busy && total === null"
          :error="total === null ? error : ''"
          :empty="total === 0"
          :title="
            notes
              ? '暂无学习笔记'
              : publishedTotal > 0
                ? '当前场景卡已全部学完'
                : '暂无可学习的场景卡'
          "
          :description="
            notes
              ? '这里会展示带学习笔记的场景卡，\n可以先学习其他场景。'
              : publishedTotal > 0
                ? '可以到学习记录复习已学场景。'
                : '场景卡发布后会在这里展示，历史学习记录会保留。'
          "
          @retry="refresh"
          ><view v-if="notes && total === 0" class="notes-empty"
            ><button @click="selectTab(LearningTab.ALL)">查看全部场景</button></view
          ><view v-else-if="total === 0 && publishedTotal > 0" class="empty-actions"
            ><button class="primary" @click="records">查看学习记录</button
            ><button @click="favorites">查看收藏</button></view
          ></AppState
        >
        <SceneCard
          v-for="card in cards"
          :key="card.id"
          :card="card"
          :source="notes ? QueueSource.LEARNING_NOTES : QueueSource.LEARNING"
        />
        <SceneListFooter
          :busy="moreBusy"
          :refreshing="busy && total !== null"
          :refresh-error="total !== null ? error : ''"
          :error="moreError"
          :has-more="hasMore"
          :done="done"
          @refresh="refresh"
          @more="loadMore"
        />
      </scroll-view>
    </template>
  </AppPage>
</template>
<style scoped lang="scss">
.list-header {
  flex-shrink: 0;
}

.scene-scroll {
  flex: 1;
  height: 0;
  min-height: 0;
}

.home-title {
  display: block;
  margin: 0 0 15.385rpx;
  font-family: var(--app-serif-font, Fraunces, Georgia, serif);
  font-size: 51.923rpx;
  font-weight: 400;
  line-height: 1.5;
}

.learner-status {
  display: block;
  font-size: 23.077rpx;
  color: #586c5b;
}

.scene-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  margin-top: 19.231rpx;

  .summary-link {
    display: flex;
    align-items: center;
    gap: 6rpx;
    min-height: 44px;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    font-size: 23.077rpx;
  }

  .summary-chevron {
    width: 13px;
    height: 13px;
  }
}

.scene-streak {
  display: flex;
  justify-content: space-between;
  padding-bottom: 16px;
  font-size: 23.077rpx;
  color: #586c5b;
}

.feedback-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #ad4f32;
}

.catalog-tabs {
  display: flex;
  gap: 32px;
  border-bottom: 1px solid #dfe5d8;

  button {
    position: relative;
    min-height: 44px;
    margin: 0;
    padding: 0 0 12px;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: #586c5b;
    font-size: 15px;
    font-weight: 500;
    line-height: 22.5px;

    &::after {
      border: 0;
    }

    &.selected {
      color: #2b4438;
      font-weight: 700;

      &::before {
        position: absolute;
        right: 0;
        bottom: -1px;
        left: 0;
        height: 2px;
        background: #41664d;
        content: '';
      }
    }
  }
}

.notes-state {
  &.empty {
    padding-top: 64px;
  }

  :deep(.empty-mark) {
    width: 57px;
    height: 65px;
    background: none;
    border-radius: 0;
    margin-bottom: 18px;
  }

  :deep(.empty-icon) {
    width: 40px;
    height: 48px;
  }

  :deep(.empty-title) {
    font-size: 18px;
    font-weight: 700;
  }

  :deep(.empty-description) {
    max-width: 250px;
    white-space: pre-line;
    margin: 0 auto;
    font-size: 13px;
  }
}

.notes-empty {
  button {
    width: 124px;
    min-height: 44px;
    margin: 42px auto 0;
    padding: 0;
    background: #e4f0db;
  }
}

.catalog-heading {
  margin-top: 17px;
  align-items: baseline;

  .section-title {
    margin: 0;
    font-size: 32.692rpx;
    font-weight: 700;
  }

  .catalog-count {
    font-size: 23.077rpx;
    color: #586c5b;
  }
}

.access-notice {
  margin: 13.462rpx 0;
  color: #586c5b;
  font-size: 23.077rpx;
  line-height: 1.8;
}

.empty-actions {
  display: flex;
  justify-content: center;
  gap: 19.231rpx;
}
</style>
