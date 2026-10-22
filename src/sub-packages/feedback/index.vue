<script setup lang="ts">
import { onReachBottom, onShow, onUnload } from '@dcloudio/uni-app'
import { ref } from 'vue'

import AppPage from '@/components/app-page/app-page.vue'
import AppState from '@/components/app-state/app-state.vue'
import { useSceneList } from '@/composables/use-scene-list'
import { feedbackTime } from '@/features/feedback/feedback-model'
import SceneListFooter from '@/features/learning/components/scene-list-footer.vue'
import { onSessionExpired, session } from '@/services/api'
import { feedbackInbox } from '@/services/feedback-service'
import { FEEDBACK_CATEGORIES, FEEDBACK_STATUS_LABELS } from '@/shared/constants/feedback'
import { Routes } from '@/shared/constants/navigation'
import { FeedbackStatus } from '@/shared/enums/feedback'
import { useAccountStore } from '@/stores/account-store'

import type { FeedbackDetail } from '@/shared/types/feedback'
const account = useAccountStore(),
  owner = ref<string | null>(null)
const list = useSceneList<FeedbackDetail>({
  path: '/api/mini/v1/feedback',
  request: session.request,
  ensure: () => account.ensure(Routes.FEEDBACK)
})
/** 通用反馈入口保留当前列表实例与滚动位置 */
const create = () => uni.navigateTo({ url: Routes.FEEDBACK_CREATE })
/** 打开同一反馈时间线，列表读取不标已读
 * @param id 本人反馈编号
 */
const detail = (id: string) =>
  uni.navigateTo({ url: `${Routes.FEEDBACK_DETAIL}?id=${encodeURIComponent(id)}` })
/** 当前本人独立刷新列表与未读，失败保留可信内容 */
const load = async () => {
  if (!(await account.ensure(Routes.FEEDBACK))) return
  if (owner.value !== session.userId()) {
    list.dispose()
    list.items.value = []
    list.total.value = null
    owner.value = session.userId()
  }
  await Promise.allSettled([list.refresh(), feedbackInbox.refresh()])
}
const unsubscribe = onSessionExpired(() => {
  list.dispose()
  list.items.value = []
  list.total.value = null
  owner.value = null
})
onShow(() => {
  void load()
})
onReachBottom(() => {
  void list.more()
})
onUnload(() => {
  list.dispose()
  unsubscribe()
})
</script>
<template>
  <AppPage title="我的反馈" back :fallback="Routes.PROFILE">
    <view class="feedback-list-head between"
      ><text>我的反馈</text
      ><button class="text-button" @click="create">
        <image src="/static/design/feedback-plus.svg" mode="aspectFit" aria-hidden="true" />提交反馈
      </button></view
    >
    <text class="feedback-list-help">提交的问题和后续回复都会保存在这里。</text>
    <AppState
      :busy="list.busy.value && list.total.value === null"
      :error="list.error.value"
      @retry="load"
    />
    <template v-if="owner && account.profile">
      <view v-if="list.total.value === 0 && !list.error.value" class="feedback-empty"
        ><view class="empty-icon"
          ><image src="/static/design/empty-book.svg" mode="aspectFit" aria-hidden="true" /></view
        ><text class="empty-title">暂无反馈</text
        ><text class="empty-help">学习中遇到问题，可以随时告诉我们。</text
        ><button class="primary" @click="create">提交反馈</button></view
      >
      <button
        v-for="item in list.items.value"
        :key="item.id"
        class="feedback-row"
        @click="detail(item.id)"
      >
        <view class="between"
          ><view class="category"
            ><text>{{
              FEEDBACK_CATEGORIES.find((category) => category.value === item.category)?.label
            }}</text
            ><text v-if="item.unread" class="feedback-dot" aria-label="有未读回复" /></view
          ><text
            class="feedback-badge"
            :class="{ warning: item.status === FeedbackStatus.NEEDS_INFO }"
            >{{ FEEDBACK_STATUS_LABELS[item.status] }}</text
          ></view
        >
        <text class="summary">{{ item.summary }}</text
        ><view class="between"
          ><text class="time">{{ feedbackTime(item.updated_at) }}</text
          ><image
            class="chevron"
            src="/static/design/feedback-chevron.svg"
            mode="aspectFit"
            aria-hidden="true"
        /></view>
      </button>
      <SceneListFooter
        :busy="list.moreBusy.value"
        :error="list.moreError.value"
        :has-more="list.total.value !== null && list.items.value.length < list.total.value"
        :done="
          list.total.value !== null &&
          list.total.value > 0 &&
          list.items.value.length >= list.total.value
        "
        @more="list.more"
      />
    </template>
  </AppPage>
</template>
<style scoped lang="scss">
.feedback-list-head {
  margin-top: 53.846rpx;
  min-height: 76.923rpx;
  align-items: flex-start;

  > text {
    font-size: 38.462rpx;
    line-height: 57.692rpx;
    font-weight: 500;
  }

  button {
    font-size: 26.923rpx;
    padding: 17.308rpx 11.538rpx;
    gap: 13.462rpx;
    line-height: 40.385rpx;
    min-height: 76.923rpx;
  }

  image {
    width: 38.462rpx;
    height: 38.462rpx;
  }
}

.feedback-list-help {
  margin-bottom: 13.462rpx;
  display: block;
  margin-top: 25rpx;
  font-size: 23.077rpx;
  line-height: 41.538rpx;
  color: #586c5b;
}

.feedback-row {
  display: block;
  width: 100%;
  text-align: left;
  padding: 34.615rpx 0;
  border: 0;
  border-bottom: 1px solid #dfe5d8;
  border-radius: 19.231rpx;
  background: #fffcf5;

  .category {
    display: flex;
    align-items: center;
    gap: 15.385rpx;
    font-size: 26.923rpx;
    font-weight: 700;
  }

  .summary {
    display: block;
    font-size: 28.846rpx;
    line-height: 46.154rpx;
    margin: 19.231rpx 0 23.077rpx;
    overflow-wrap: anywhere;
  }

  .time {
    color: #586c5b;
    font-size: 23.077rpx;
    line-height: 34.615rpx;
    white-space: nowrap;
  }

  .chevron {
    width: 38.462rpx;
    height: 38.462rpx;
  }
}

.feedback-dot {
  display: inline-block;
  width: 15.385rpx;
  height: 15.385rpx;
  background: #ad4f32;
  border-radius: 50%;
}

.feedback-badge {
  flex-shrink: 0;
  font-size: 23.077rpx;
  line-height: 36.923rpx;
  border-radius: 7.692rpx;
  padding: 5.769rpx 13.462rpx;
  background: #e4f0db;
  color: #47614b;

  &.warning {
    background: #f8edc4;
    color: #785a20;
  }
}

.feedback-empty {
  padding: 92.308rpx 15.385rpx 69.231rpx;
  text-align: center;

  .empty-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 96.154rpx;
    height: 96.154rpx;
    margin: auto;
    border-radius: 50%;
    background: #e4f0db;

    image {
      width: 48.077rpx;
      height: 48.077rpx;
    }
  }

  .empty-title {
    display: block;
    font-size: 34.615rpx;
    font-weight: 500;
    line-height: 51.923rpx;
    margin-top: 34.615rpx;
  }

  .empty-help {
    display: block;
    font-size: 23.077rpx;
    line-height: 43.846rpx;
    color: #586c5b;
    margin-top: 19.231rpx;
  }

  button {
    display: inline-block;
    margin-top: 42.308rpx;
    min-height: 76.923rpx;
    font-size: 26.923rpx;
    padding: 15.385rpx 46.154rpx;
  }
}
</style>
