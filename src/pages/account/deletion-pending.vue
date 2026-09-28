<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

import AppButton from '@/components/app-button/app-button.vue'
import AppPage from '@/components/app-page/app-page.vue'
import AppState from '@/components/app-state/app-state.vue'
import PageHeader from '@/components/page-header/page-header.vue'
import { reloadAfterDeletionRevoke } from '@/features/account/account-recovery'
import { presentDeletionState } from '@/features/account/deletion-presenter'
import { getRuntimeServices } from '@/services/runtime'
import { navigate } from '@/shared/navigation/navigate'
import { createServerClock } from '@/shared/utils/server-clock'
import { useAccountDeletionStore } from '@/stores/account-deletion'
import { useFavoriteStore } from '@/stores/favorites'
import { useHomeStore } from '@/stores/home'
import { useLearningStore } from '@/stores/learning'
import { useSessionStore } from '@/stores/session'

import type { DeletionRequest } from '@/shared/contracts/account'

const deletion = useAccountDeletionStore()
const error = ref('')
const loading = ref(false)
const view = computed(() =>
  deletion.request ? presentDeletionState(deletion.request, createServerClock()) : undefined
)

/** 恢复最近注销响应；缺失时从本人档案补足当前服务端状态。 */
async function loadDeletion() {
  deletion.restore()
  if (deletion.request) return
  const profile = await getRuntimeServices().profile.get()
  if (!profile.deletion) return
  deletion.save({
    completed_at: null,
    effective_at: profile.deletion.effective_at,
    id: '',
    requested_at: '',
    revoked_at: null,
    status: profile.deletion.status as DeletionRequest['status']
  })
}

/** 撤回注销后重新加载首页、目录、收藏、权益和本人状态。 */
async function revokeDeletion() {
  loading.value = true
  error.value = ''
  try {
    await getRuntimeServices().account.revokeDeletion()
    deletion.clear()
    const runtime = getRuntimeServices()
    const session = useSessionStore()
    const favorites = useFavoriteStore()
    const home = useHomeStore()
    const learning = useLearningStore()
    await reloadAfterDeletionRevoke([
      async () => {
        session.profile = await runtime.profile.get()
      },
      () => home.load(runtime.home),
      () => learning.load(runtime.catalog),
      () => favorites.load(runtime.favorites, true),
      () => runtime.entitlements.get()
    ])
    await navigate({ type: 'reLaunch', url: '/pages/profile/index' })
  } catch {
    error.value = '撤回失败，账号仍处于待注销状态，请稍后重试'
  } finally {
    loading.value = false
  }
}

onShow(loadDeletion)
</script>

<template>
  <AppPage>
    <PageHeader eyebrow="将在七天后生效" :show-back="false" title="账号处于注销期" />
    <view v-if="view" class="deletion-pending">
      <text class="deletion-pending__title">预计生效：{{ view.effectiveLabel }}</text>
      <text class="deletion-pending__description">
        限时学习倒计时不会因注销暂停或重置。撤回后将恢复原学习进度、收藏和有效权益。
      </text>
      <text v-if="error" class="deletion-pending__error">{{ error }}</text>
      <AppButton
        v-if="view.canRevoke"
        :loading="loading"
        label="撤回注销"
        @press="revokeDeletion"
      />
      <AppState
        v-else
        description="注销正在生效，当前阶段无法撤回。"
        icon-label="账号处理中"
        title="账号状态处理中"
      />
    </view>
  </AppPage>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.deletion-pending {
  padding: 32rpx;
  border: 2rpx solid #ead4ad;
  border-radius: tokens.$radius-large;
  background: #fff5df;

  &__title,
  &__description,
  &__error {
    display: block;
  }

  &__title {
    color: tokens.$color-warning;
    font-size: 30rpx;
    font-weight: 700;
  }

  &__description {
    margin: 16rpx 0 28rpx;
    font-size: 24rpx;
    line-height: 1.7;
  }

  &__error {
    margin-bottom: 18rpx;
    color: tokens.$color-danger;
    font-size: 23rpx;
  }
}
</style>
