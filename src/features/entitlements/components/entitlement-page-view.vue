<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

import AppPage from '@/components/app-page/app-page.vue'
import AppState from '@/components/app-state/app-state.vue'
import PageHeader from '@/components/page-header/page-header.vue'
import EntitlementCard from '@/features/entitlements/components/entitlement-card.vue'
import ExpiryNotice from '@/features/entitlements/components/expiry-notice.vue'
import {
  type EntitlementsViewModel,
  type LimitedEntitlementViewModel,
  presentEntitlements
} from '@/features/entitlements/entitlement-presenter'
import LearningResultCards from '@/features/learning-result/components/learning-result-cards.vue'
import { presentLearningResult } from '@/features/learning-result/result-presenter'
import { getRuntimeServices } from '@/services/runtime'
import { navigate } from '@/shared/navigation/navigate'
import { createServerClock } from '@/shared/utils/server-clock'

const props = withDefaults(
  defineProps<{
    state?: LimitedEntitlementViewModel['state'] | 'ALL'
    title?: string
  }>(),
  { state: 'ALL', title: '学习权益' }
)

const view = ref<EntitlementsViewModel>({
  authorizationPending: false,
  formal: [],
  limited: []
})
const items = computed(() =>
  props.state === 'ALL'
    ? view.value.limited
    : view.value.limited.filter((item) => item.state === props.state)
)
const endedCards = presentLearningResult(null).cards

/** 从服务端读取权益投影，并使用响应时刻建立时钟。 */
async function load() {
  const dto = await getRuntimeServices().entitlements.get()
  const now = new Date()
  view.value = presentEntitlements(dto, createServerClock(now, now))
}

/** 按 presenter 状态进入唯一状态页。 */
async function openItem(item: LimitedEntitlementViewModel) {
  const route = item.state.toLocaleLowerCase()
  await navigate({ type: 'navigateTo', url: `/pages/entitlement/${route}` })
}

/** 打开结束后仍保留的成果或收藏明细。 */
async function openResult(route: string) {
  await navigate({ type: 'navigateTo', url: route })
}

onShow(load)
</script>

<template>
  <AppPage>
    <PageHeader eyebrow="服务端权益" :title="title" />
    <AppState
      v-if="view.authorizationPending"
      description="正在重新确认权益，确认完成前不会开放受限正文。"
      icon-label="权益确认中"
      title="权益状态暂不可用"
    />
    <view v-else class="entitlement-page">
      <view v-if="view.formal.length > 0 && state === 'ALL'" class="entitlement-page__formal">
        <text class="entitlement-page__heading">正式内容包</text>
        <text v-for="item in view.formal" :key="item.id" class="entitlement-page__formal-item">
          {{ item.title }} · {{ item.status }}
        </text>
      </view>
      <ExpiryNotice
        v-if="items[0]?.state === 'ENDING' && items[0].expiresAt"
        :expires-at="items[0].expiresAt"
      />
      <view class="entitlement-page__list">
        <EntitlementCard v-for="item in items" :key="item.id" :item="item" @open="openItem" />
      </view>
      <LearningResultCards v-if="state === 'ENDED'" :cards="endedCards" @select="openResult" />
      <AppState
        v-if="items.length === 0 && view.formal.length === 0"
        description="当前账号没有该状态的学习权益。"
        icon-label="暂无权益"
        title="暂无权益记录"
      />
    </view>
  </AppPage>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.entitlement-page {
  &__formal {
    margin-bottom: 24rpx;
    padding: 28rpx;
    border-radius: tokens.$radius-large;
    background: tokens.$color-module;
  }

  &__heading,
  &__formal-item {
    display: block;
  }

  &__heading {
    font-size: 30rpx;
    font-weight: 700;
  }

  &__formal-item {
    margin-top: 14rpx;
    color: tokens.$color-text-muted;
    font-size: 24rpx;
  }

  &__list {
    display: grid;
    margin: 20rpx 0;
    gap: 16rpx;
  }
}
</style>
