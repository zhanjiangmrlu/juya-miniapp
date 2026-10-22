<script setup lang="ts">
import { onHide, onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { computed, nextTick, ref, shallowRef } from 'vue'

import AppPage from '@/components/app-page/app-page.vue'
import AppState from '@/components/app-state/app-state.vue'
import { useUnsavedGuard } from '@/composables/use-unsaved-guard'
import FeedbackComposer from '@/features/feedback/components/feedback-composer.vue'
import FeedbackLeaveDialog from '@/features/feedback/components/feedback-leave-dialog.vue'
import FeedbackThread from '@/features/feedback/components/feedback-thread.vue'
import { onSessionExpired, session } from '@/services/api'
import { feedbackDraft, feedbackInbox } from '@/services/feedback-service'
import { openScene } from '@/services/navigation'
import { FEEDBACK_CATEGORIES, FEEDBACK_STATUS_LABELS } from '@/shared/constants/feedback'
import { Routes } from '@/shared/constants/navigation'
import { FeedbackSource, FeedbackStatus } from '@/shared/enums/feedback'
import { LeaveChoice } from '@/shared/enums/profile'
import { useAccountStore } from '@/stores/account-store'

import type { FeedbackDetail } from '@/shared/types/feedback'
const account = useAccountStore(),
  feedback = shallowRef<FeedbackDetail | null>(null),
  draft = shallowRef<ReturnType<typeof feedbackDraft> | null>(null),
  busy = ref(false),
  error = ref(''),
  readError = ref(''),
  confirmation = ref('')
let id = '',
  alive = true,
  visible = true,
  generation = 0
const categoryLabel = computed(
  () => FEEDBACK_CATEGORIES.find((item) => item.value === feedback.value?.category)?.label || ''
)
const dirty = computed(() =>
    Boolean(draft.value?.active.value && (draft.value.dirty.value || draft.value.unknown.value))
  ),
  writing = computed(() =>
    Boolean(busy.value || draft.value?.busy.value || draft.value?.uploading.value)
  )
const guard = useUnsavedGuard(dirty, writing, async () => false, Routes.FEEDBACK)
/** 时间线渲染完成后确认该快照水位，失败提供独立重试 */
const markRead = async () => {
  const snapshot = feedback.value
  if (!snapshot) return
  const owner = session.userId()
  readError.value = ''
  try {
    await feedbackInbox.acknowledge(
      snapshot,
      () => alive && visible && feedback.value === snapshot && owner === session.userId()
    )
  } catch (reason) {
    if (alive && owner === session.userId())
      readError.value = reason instanceof Error ? reason.message : '已读状态暂未同步，请重试'
  }
}
/** 保留原补充草稿，读取失败不替换为不存在或清空时间线 */
const load = async () => {
  if (busy.value || !id) return
  busy.value = true
  error.value = ''
  const run = ++generation
  try {
    if (!(await account.ensure(`${Routes.FEEDBACK_DETAIL}?id=${encodeURIComponent(id)}`))) return
    const owner = session.userId(),
      value = await session.request<FeedbackDetail>(
        `/api/mini/v1/feedback/${encodeURIComponent(id)}`
      )
    if (!alive || run !== generation || owner !== session.userId()) return
    feedback.value = value
    draft.value = feedbackDraft(id)
    const recovered = await draft.value.resume()
    if (recovered) {
      confirmation.value = '上次补充已提交'
      feedback.value = await session.request<FeedbackDetail>(
        `/api/mini/v1/feedback/${encodeURIComponent(id)}`
      )
    }
    await nextTick()
    await markRead()
  } catch (reason) {
    if (alive && run === generation)
      error.value = reason instanceof Error ? reason.message : '反馈暂未获取，请重试'
  } finally {
    if (run === generation) busy.value = false
  }
}
/** 任意状态均可在同条记录追加，真实接受后重取完整服务端顺序 */
const submit = async () => {
  const value = await draft.value?.submit()
  if (value) {
    confirmation.value = '补充已提交，反馈重新进入待处理'
    await load()
  }
}
/** 仅当前仍有效的来源打开发布详情，不展示反馈时旧正文 */
const source = () => {
  if (feedback.value?.source_available && feedback.value.card_id)
    void openScene(feedback.value.card_id)
}
/** 未提交可放弃，未知补充离开保留本人恢复快照
 * @param choice 用户继续或放弃的明确选择
 */
const chooseLeave = async (choice: LeaveChoice) => {
  if (choice === LeaveChoice.DISCARD) draft.value?.discard()
  await guard.choose(choice)
}
const unsubscribe = onSessionExpired(() => {
  generation++
  feedback.value = null
  readError.value = ''
  error.value = ''
  busy.value = false
})
onLoad((query) => {
  id = String(query?.id || '')
  if (!/^[A-Za-z0-9-]{1,64}$/.test(id)) {
    id = ''
    error.value = '反馈编号无效'
  }
})
onShow(() => {
  visible = true
  void load()
})
onHide(() => {
  visible = false
})
onUnload(() => {
  alive = false
  generation++
  unsubscribe()
})
</script>
<template>
  <AppPage title="反馈详情" back custom-back :fallback="Routes.FEEDBACK" @back="guard.requestBack">
    <AppState :busy="busy && !feedback" :error="error" @retry="load" />
    <template v-if="feedback && draft?.active.value">
      <view class="feedback-meta between"
        ><text>{{ categoryLabel }}</text
        ><text
          class="feedback-badge"
          :class="{ warning: feedback.status === FeedbackStatus.NEEDS_INFO }"
          >{{ FEEDBACK_STATUS_LABELS[feedback.status] }}</text
        ></view
      >
      <view v-if="feedback.source === FeedbackSource.SCENE" class="feedback-source"
        ><image
          src="/static/design/feedback-source.svg"
          mode="aspectFit"
          aria-hidden="true"
        /><button v-if="feedback.source_available" class="text-button" @click="source">
          <view class="source-titles"
            ><text>{{ feedback.source_title || '来源场景' }}</text
            ><text v-if="feedback.source_title_en" class="source-english">{{
              feedback.source_title_en
            }}</text></view
          ></button
        ><view v-else class="source-titles"
          ><text
            >{{ feedback.source_title || '来源场景' }} ·
            {{
              feedback.source_unavailable_reason === 'deleted' ? '来源已删除' : '来源不可用'
            }}</text
          ><text v-if="feedback.source_title_en" class="source-english">{{
            feedback.source_title_en
          }}</text></view
        ></view
      >
      <view v-else class="feedback-source">来自账号资料</view>
      <FeedbackThread :feedback="feedback" />
      <view v-if="readError" class="notice error"
        >{{ readError }}<button class="text-button" @click="markRead">重试已读同步</button></view
      >
      <view v-if="confirmation" class="notice success">{{ confirmation }}</view>
      <view class="feedback-supplement"
        ><text class="supplement-title">继续补充</text
        ><text class="supplement-help">追加说明后，反馈会重新进入待处理。</text
        ><FeedbackComposer
          :draft="draft"
          supplement
          :editable="guard.canEdit.value && !busy"
          @submit="submit"
      /></view>
      <button class="text-button refresh" :disabled="writing" @click="load">刷新反馈与截图</button>
    </template>
    <page-container
      :show="guard.nativeShow.value"
      :overlay="false"
      position="bottom"
      :duration="1"
      @beforeleave="guard.nativeBeforeLeave"
      @afterleave="guard.nativeAfterLeave"
      ><view
    /></page-container>
    <FeedbackLeaveDialog
      v-if="guard.open.value"
      :unknown="draft?.unknown.value"
      @choose="chooseLeave"
    />
  </AppPage>
</template>
<style scoped lang="scss">
.feedback-meta {
  font-size: 26.923rpx;
  line-height: 44.423rpx;
  font-weight: 700;
}

.feedback-badge {
  padding: 5.769rpx 13.462rpx;
  font-size: 19.231rpx;
  font-weight: 400;
  line-height: 30.769rpx;
  background: #e4f0db;
  color: #47614b;
  border-radius: 7.692rpx;

  &.warning {
    background: #f8edc4;
    color: #785a20;
  }
}

.source-titles {
  text {
    display: block;
  }

  .source-english {
    font-size: 23.077rpx;
    line-height: 37.5rpx;
    margin-top: 7.692rpx;
  }
}

.feedback-source {
  display: flex;
  align-items: flex-start;
  gap: 15.385rpx;
  padding-top: 26.923rpx;
  padding-bottom: 34.615rpx;
  color: #586c5b;
  font-size: 25rpx;
  line-height: 41.25rpx;

  image {
    width: 30.769rpx;
    height: 38.462rpx;
    flex-shrink: 0;
  }

  button {
    padding: 0;
    min-height: 0;
    font-size: 25rpx;
    line-height: 41.25rpx;
    color: #586c5b;
    text-align: left;
  }
}

.feedback-supplement {
  margin-top: 53.846rpx;

  .supplement-title {
    display: block;
    font-size: 32.692rpx;
    line-height: 47.404rpx;
    font-weight: 700;
  }

  .supplement-help {
    display: block;
    margin: 26.923rpx 0;
    font-size: 23.077rpx;
    line-height: 41.538rpx;
    color: #586c5b;
  }
}

.refresh {
  margin: 30.769rpx auto 0;
  font-size: 23.077rpx;
}
</style>
