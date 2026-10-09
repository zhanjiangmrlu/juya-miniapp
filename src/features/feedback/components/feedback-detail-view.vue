<script setup lang="ts">
import { onLoad, onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

import AppButton from '@/components/app-button/app-button.vue'
import AppState from '@/components/app-state/app-state.vue'
import FeedbackImagePicker from '@/features/feedback/components/feedback-image-picker.vue'
import FeedbackResolutionActions from '@/features/feedback/components/feedback-resolution-actions.vue'
import FeedbackTimeline from '@/features/feedback/components/feedback-timeline.vue'
import { canSupplementFeedback, validateSupplement } from '@/features/feedback/feedback-form'
import { getFeedbackStatusLabel } from '@/features/feedback/feedback-presenter'
import { submitSupplement } from '@/features/feedback/supplement-submit'
import { loadAllMessages } from '@/features/messages/load-messages'
import PersonalPage from '@/features/profile/components/personal-page.vue'
import PersonalRow from '@/features/profile/components/personal-row.vue'
import PersonalSummary from '@/features/profile/components/personal-summary.vue'
import { ApiError } from '@/services/http/errors'
import { getRuntimeServices } from '@/services/runtime'
import { FEEDBACK_CATEGORIES } from '@/shared/constants/feedback'
import { FeedbackResolutionAction, FeedbackStatus } from '@/shared/enums/feedback'
import { MessageRelatedType } from '@/shared/enums/messages'
import { NavigationType } from '@/shared/enums/navigation'
import { ProfileRowSize } from '@/shared/enums/profile'
import { navigate } from '@/shared/navigation/navigate'

import type { FeedbackItem, FeedbackResolutionRequest } from '@/shared/contracts/feedback'
import type { FeedbackScreenshotDraft } from '@/shared/types/feedback'
import type { FeedbackDetailViewProps } from '@/shared/types/feedback-components'
import type { InputValueEvent } from '@/shared/types/ui'
withDefaults(defineProps<FeedbackDetailViewProps>(), { resultMode: false })
const feedbackId = ref('')
const item = ref<FeedbackItem>()
const supplement = ref('')
const editing = ref(false)
const screenshot = ref<FeedbackScreenshotDraft>()
const busy = ref(false)
const error = ref('')
const canSupplement = computed(() => (item.value ? canSupplementFeedback(item.value) : false))
/** 记录路由反馈标识，query 为有效反馈详情参数 */
const capture = (query?: Record<string, string | undefined>) => {
  feedbackId.value = query?.id || ''
}
/** 加载最新时间线并在本人打开记录后清除关联未读消息 */
const load = async () => {
  if (!feedbackId.value) return
  try {
    const runtime = getRuntimeServices()
    item.value = await runtime.feedback.get(feedbackId.value)
    const messages = await loadAllMessages(runtime.messages)
    await Promise.all(
      messages
        .filter(
          (message) =>
            !message.read_at &&
            message.related_type === MessageRelatedType.FEEDBACK &&
            message.related_id === feedbackId.value
        )
        .map((message) => runtime.messages.markRead(message.id))
    )
    error.value = ''
  } catch {
    error.value = '反馈读取失败，请重试'
  }
}
/** 同步本机补充草稿，event 为输入事件 */
const input = (event: unknown) => {
  supplement.value = (event as InputValueEvent<string>).detail.value
}
/** 提交补充说明，失败保留草稿供修改或重试 */
const submit = async () => {
  if (busy.value || !canSupplement.value) return
  const validation = validateSupplement(supplement.value)
  if (!validation.valid || !validation.normalized) {
    editing.value = true
    error.value = '补充说明需为 1 至 300 字'
    return
  }
  busy.value = true
  try {
    item.value = await submitSupplement(
      getRuntimeServices().feedback,
      item.value!,
      validation.normalized,
      screenshot.value
    )
    supplement.value = ''
    screenshot.value = undefined
    editing.value = false
    error.value = ''
  } catch (caught) {
    error.value =
      caught instanceof ApiError && caught.code === 'FEEDBACK_CONTENT_BLOCKED'
        ? '内容未通过检查，请修改后重新提交'
        : caught instanceof Error &&
            (caught.message.includes('截图') || caught.message.includes('图片'))
          ? caught.message
          : '补充提交失败，草稿已保留，请重试'
  } finally {
    busy.value = false
  }
}
/** 在详情和结果页面间跳转，result 为是否打开结果页面 */
const open = (result: boolean) =>
  navigate({
    type: NavigationType.NAVIGATE_TO,
    url: `/sub-packages/feedback/${result ? 'resolution' : 'detail'}?id=${encodeURIComponent(feedbackId.value)}`
  })
/** 发送用户解决状态，payload 为已解决或含原因的重开命令 */
const resolve = async (payload: FeedbackResolutionRequest) => {
  if (busy.value) return
  busy.value = true
  try {
    item.value = await getRuntimeServices().feedback.resolve(feedbackId.value, payload)
    error.value = ''
    if (payload.action === FeedbackResolutionAction.REOPEN)
      await navigate({
        type: NavigationType.REDIRECT_TO,
        url: `/sub-packages/feedback/detail?id=${encodeURIComponent(feedbackId.value)}`
      })
  } catch {
    error.value = '结果提交失败，请重试'
  } finally {
    busy.value = false
  }
}
onLoad(capture)
onShow(load)
</script>
<template>
  <PersonalPage
    :navigation="resultMode ? '反馈结果' : '反馈详情'"
    :title="resultMode ? '反馈处理结果' : '反馈详情'"
    :subtitle="
      resultMode
        ? `${item?.title || '问题反馈'} · ${getFeedbackStatusLabel(item?.status || '')}`
        : `${FEEDBACK_CATEGORIES.find((category) => category.value === item?.category)?.label || '问题反馈'} · ${feedbackId}`
    "
  >
    <template v-if="item">
      <PersonalSummary
        :label="resultMode ? '处理结果' : '当前状态'"
        :value="getFeedbackStatusLabel(item.status)"
        :note="
          resultMode
            ? '谢谢你的反馈，本次结果已记录。'
            : canSupplement
              ? '等待你补充期间不计入处理时限'
              : '所有回复与补充保留在同一条记录中'
        "
      />
      <text class="section-title">{{ resultMode ? '后续操作' : '处理时间线' }}</text>
      <view v-if="resultMode" class="row-list"
        ><PersonalRow
          title="查看完整时间线"
          detail="原说明、补充和回复都在同一条记录中"
          badge="查看"
          :size="ProfileRowSize.TALL"
          actionable
          @press="open(false)" /><PersonalRow
          title="确认是否解决"
          detail="已处理后 7 天内可以反馈结果"
          badge="操作"
          :size="ProfileRowSize.TALL"
      /></view>
      <template v-else
        ><FeedbackTimeline :item="item" /><view v-if="canSupplement" class="supplement-card"
          ><PersonalRow
            title="补充说明"
            detail="最多 300 字，可添加 1 张截图"
            badge="待填写"
            actionable
            @press="editing = true" />
          <textarea
            v-if="editing"
            class="form-field supplement-input"
            maxlength="300"
            :value="supplement"
            placeholder="请根据管理员回复补充说明"
            @input="input" /><FeedbackImagePicker
            v-if="editing && !item.screenshots.length"
            :image="screenshot"
            @select="screenshot = $event" /></view
      ></template>
      <text v-if="error" class="form-error">{{ error }}</text>
    </template>
    <AppState
      v-else
      icon-label="反馈"
      title="暂未找到反馈详情"
      :description="error || '请从我的反馈或站内消息进入有效记录'"
    />
    <template #actions
      ><FeedbackResolutionActions
        v-if="item && resultMode"
        :item="item"
        :loading="busy"
        @resolve="resolve" /><AppButton
        v-else-if="canSupplement"
        label="提交补充"
        :loading="busy"
        @press="submit" /><AppButton
        v-else-if="item?.status === FeedbackStatus.RESOLVED"
        label="查看处理结果"
        @press="open(true)"
    /></template>
  </PersonalPage>
</template>
<style scoped lang="scss">
@use '../../profile/personal';

.supplement-card {
  margin-top: 10px;

  .supplement-input {
    height: 80px;
    margin-top: 8px;
  }
}
</style>
