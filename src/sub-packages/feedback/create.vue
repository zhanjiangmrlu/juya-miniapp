<script setup lang="ts">
import { onLoad, onShow } from '@dcloudio/uni-app'
import { computed, ref, shallowRef } from 'vue'

import AppPage from '@/components/app-page/app-page.vue'
import AppState from '@/components/app-state/app-state.vue'
import { useUnsavedGuard } from '@/composables/use-unsaved-guard'
import FeedbackComposer from '@/features/feedback/components/feedback-composer.vue'
import FeedbackLeaveDialog from '@/features/feedback/components/feedback-leave-dialog.vue'
import { session } from '@/services/api'
import { feedbackDraft } from '@/services/feedback-service'
import { Routes } from '@/shared/constants/navigation'
import { FeedbackSource } from '@/shared/enums/feedback'
import { LeaveChoice } from '@/shared/enums/profile'
import { useAccountStore } from '@/stores/account-store'

import type { FeedbackDetail, FeedbackOrigin } from '@/shared/types/feedback'
import type { PublishedScene } from '@/shared/types/learning'
const account = useAccountStore(),
  draft = shallowRef<ReturnType<typeof feedbackDraft> | null>(null),
  error = ref(''),
  loading = ref(false),
  opened = ref<FeedbackDetail | null>(null)
let origin: FeedbackOrigin = { source: FeedbackSource.PROFILE },
  cardId = '',
  versionId = '',
  invalidSource = false
const dirty = computed(() =>
    Boolean(draft.value?.active.value && (draft.value.dirty.value || draft.value.unknown.value))
  ),
  busy = computed(() =>
    Boolean(loading.value || draft.value?.busy.value || draft.value?.uploading.value)
  )
const guard = useUnsavedGuard(dirty, busy, async () => false, Routes.FEEDBACK)
/** 真实成功后替换表单页，保留原U03或U10实例作为返回栈
 * @param value 服务端接受的反馈快照
 */
const openAccepted = async (value: FeedbackDetail) => {
  opened.value = value
  await new Promise<void>((resolve, reject) =>
    uni.redirectTo({
      url: `${Routes.FEEDBACK_DETAIL}?id=${encodeURIComponent(value.id)}`,
      success: () => resolve(),
      fail: () => reject(new Error('反馈已提交，详情暂未打开，请重试'))
    })
  )
}
/** 页面重新进入先确认同一账号、当前来源和上次提交回执 */
const load = async () => {
  if (loading.value) return
  if (invalidSource) {
    error.value = '来源参数无效，请返回场景重新进入'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const target =
      cardId && versionId
        ? `${Routes.FEEDBACK_CREATE}?card_id=${encodeURIComponent(cardId)}&version_id=${encodeURIComponent(versionId)}`
        : Routes.FEEDBACK_CREATE
    if (!(await account.ensure(target))) return
    draft.value = feedbackDraft()
    const recovered = await draft.value.resume()
    if (recovered) {
      await openAccepted(recovered)
      return
    }
    if ((draft.value.dirty.value || draft.value.unknown.value) && !draft.value.refill.value) return
    if (cardId) {
      const current = await session.request<PublishedScene>(
        `/api/mini/v1/cards/${encodeURIComponent(cardId)}?mark_started=false`
      )
      if (current.version_id !== versionId) throw new Error('内容已更新，请返回场景重新发起反馈')
      origin = {
        source: FeedbackSource.SCENE,
        card_id: cardId,
        version_id: versionId,
        title: current.content.name,
        titleEn: current.content.title_en || ''
      }
    }
    draft.value.source.value = origin
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '反馈入口暂未获取'
  } finally {
    loading.value = false
  }
}
/** 保留输入直到提交真实成功，失败时留在当前页 */
const submit = async () => {
  const value = await draft.value?.submit()
  if (value)
    try {
      await openAccepted(value)
    } catch (reason) {
      error.value = reason instanceof Error ? reason.message : '详情暂未打开'
    }
}
/** 未提交可放弃，未知事务离开保留本人恢复快照
 * @param choice 用户继续或放弃选择
 */
const chooseLeave = async (choice: LeaveChoice) => {
  if (choice === LeaveChoice.DISCARD) draft.value?.discard()
  await guard.choose(choice)
}
/** 已提交导航失败只重开详情，不重复创建反馈 */
const reopen = () => {
  if (opened.value)
    void openAccepted(opened.value).catch((reason: Error) => {
      error.value = reason.message
    })
}
onLoad((query) => {
  cardId = String(query?.card_id || '')
  versionId = String(query?.version_id || '')
  if (
    (cardId && !/^[A-Za-z0-9-]{1,64}$/.test(cardId)) ||
    (versionId && !/^[A-Za-z0-9-]{1,64}$/.test(versionId)) ||
    Boolean(cardId) !== Boolean(versionId)
  ) {
    invalidSource = true
    error.value = '来源参数无效'
  }
})
onShow(() => {
  void load()
})
</script>
<template>
  <AppPage title="提交反馈" back custom-back :fallback="Routes.FEEDBACK" @back="guard.requestBack">
    <AppState :busy="loading && !draft" :error="error" @retry="opened ? reopen() : load()" />
    <template v-if="draft?.active.value && !opened && !error">
      <text class="feedback-title">告诉我们哪里需要改进</text>
      <view v-if="draft.source.value.source === FeedbackSource.SCENE" class="feedback-source"
        ><image src="/static/design/feedback-source.svg" mode="aspectFit" aria-hidden="true" /><view
          class="source-titles"
          ><text>{{ draft.source.value.title || '当前场景' }}</text
          ><text v-if="draft.source.value.titleEn" class="source-english">{{
            draft.source.value.titleEn
          }}</text></view
        ></view
      >
      <text v-else class="feedback-help">我们会在这条反馈中持续回复。</text>
      <FeedbackComposer
        :draft="draft"
        :editable="guard.canEdit.value && !loading"
        @submit="submit"
      />
      <view v-if="!guard.canEdit.value" class="notice error"
        >当前微信版本不支持安全返回，请更新微信后提交。</view
      >
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
.feedback-title {
  display: block;
  font-size: 40.385rpx;
  font-weight: 700;
  line-height: 58.558rpx;
}

.feedback-help {
  display: block;
  margin-top: 13.462rpx;
  margin-bottom: 46.154rpx;
  font-size: 23.077rpx;
  line-height: 41.538rpx;
  color: #586c5b;
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
  margin-bottom: 46.154rpx;
  color: #586c5b;
  font-size: 25rpx;
  line-height: 41.25rpx;

  image {
    width: 30.769rpx;
    height: 38.462rpx;
    flex-shrink: 0;
  }
}
</style>
