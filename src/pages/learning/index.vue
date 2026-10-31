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
let sharedEntry = false,
  requiresIdentityCheck = browseOnly.value
const {
  items: cards,
  total,
  publishedTotal,
  accessContext,
  freeRemaining,
  busy,
  moreBusy,
  error,
  moreError,
  hasMore,
  done,
  refresh: refreshList,
  restart: restartList,
  more: loadMore,
  dispose,
  reset: resetList
} = useSceneList<CardBrief>({
  path: '/api/mini/v1/cards',
  pageSize: () => listPageSize(268.577, 1050),
  request: session.request,
  userId: session.userId,
  ensure: () => account.ensure(Routes.LEARNING)
})
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
const position = useListPosition(session.userId, restoreScroll)
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
  resetList()
  position.reset()
  scrollTop.value = 0
}
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
  requiresIdentityCheck = false
  await Promise.allSettled([refresh(), refreshStats(), feedbackInbox.refresh()])
  if (!runtimeMode.update()) accessReady.value = true
}
onShow(showPage)
onLoad((query) => {
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
        <view class="catalog-heading between">
          <text class="section-title">待学场景</text>
          <text v-if="total !== null" class="catalog-count">{{ total }} 张</text>
        </view>
        <view
          v-if="
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
        :scroll-top="scrollTop"
        refresher-enabled
        :refresher-triggered="refreshing"
        refresher-background="transparent"
        @scroll="onListScroll"
        @scrolltolower="more"
        @refresherrefresh="pullRefresh"
      >
        <AppState
          :busy="busy && total === null"
          :error="total === null ? error : ''"
          :empty="total === 0"
          :title="publishedTotal > 0 ? '当前场景卡已全部学完' : '暂无可学习的场景卡'"
          :description="
            publishedTotal > 0
              ? '可以到学习记录复习已学场景。'
              : '场景卡发布后会在这里展示，历史学习记录会保留。'
          "
          @retry="refresh"
          ><view v-if="total === 0 && publishedTotal > 0" class="empty-actions"
            ><button class="primary" @click="records">查看学习记录</button
            ><button @click="favorites">查看收藏</button></view
          ></AppState
        >
        <SceneCard v-for="card in cards" :key="card.id" :card="card" source="learning" />
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
  border-bottom: 1px solid #dfe5d8;
  padding-bottom: 34.615rpx;
  font-size: 23.077rpx;
  color: #586c5b;
}

.feedback-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #ad4f32;
}

.catalog-heading {
  margin-top: 34.615rpx;
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
