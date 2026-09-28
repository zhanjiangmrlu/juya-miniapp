<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { reactive, ref } from 'vue'

import AppButton from '@/components/app-button/app-button.vue'
import AppPage from '@/components/app-page/app-page.vue'
import PageHeader from '@/components/page-header/page-header.vue'
import AccountMetrics from '@/features/account/components/account-metrics.vue'
import {
  clearLocalDeletionDrafts,
  createUniLocalDataScope
} from '@/features/account/local-data-cleaner'
import { getRuntimeServices } from '@/services/runtime'
import { navigate } from '@/shared/navigation/navigate'
import { useAccountDeletionStore } from '@/stores/account-deletion'

const deletion = useAccountDeletionStore()
const error = ref('')
const loading = ref(false)
const metrics = reactive({
  completedScenes: 0,
  favoriteCount: 0,
  longestStreak: 0,
  totalDays: 0,
  validEntitlements: 0
})

/** 读取挽留页所需的真实学习数据，不使用示例统计。 */
async function loadMetrics() {
  const runtime = getRuntimeServices()
  const [home, favorites, history, entitlements] = await Promise.all([
    runtime.home.getHome(),
    runtime.favorites.list(),
    runtime.client.get<{ items: unknown[] }>('/api/v1/history/scenes'),
    runtime.entitlements.get()
  ])
  metrics.totalDays = home.checkins.total_days
  metrics.longestStreak = home.checkins.longest_streak
  metrics.favoriteCount = favorites.items.length
  metrics.completedScenes = history.items.length
  metrics.validEntitlements =
    entitlements.formal.filter((item) => item.status === 'ACTIVE').length +
    entitlements.limited.filter((item) => item.status === 'ACTIVE').length
}

/** 保留账号并回到首页继续学习。 */
async function keepAccount() {
  await navigate({ type: 'reLaunch', url: '/pages/home/index' })
}

/** 服务端受理注销后清除本地敏感草稿，并进入七天撤回页面。 */
async function requestDeletion() {
  loading.value = true
  error.value = ''
  try {
    const accepted = await getRuntimeServices().account.requestDeletion()
    deletion.save(accepted)
    clearLocalDeletionDrafts(createUniLocalDataScope())
    await navigate({ type: 'redirectTo', url: '/pages/account/deletion-pending' })
  } catch {
    error.value = '暂时无法申请注销，请稍后重试'
  } finally {
    loading.value = false
  }
}

onLoad(loadMetrics)
</script>

<template>
  <AppPage>
    <PageHeader eyebrow="请先看看将失去的内容" title="注销账号" />
    <AccountMetrics v-bind="metrics" />
    <text class="delete-confirm__notice">
      注销生效后，身份、联系资料、收藏、进度、打卡及权益关联将被删除或匿名化。
    </text>
    <text v-if="error" class="delete-confirm__error">{{ error }}</text>
    <view class="delete-confirm__actions">
      <AppButton label="保留账号，继续学习" @press="keepAccount" />
      <AppButton :loading="loading" label="继续注销" variant="danger" @press="requestDeletion" />
    </view>
  </AppPage>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.delete-confirm {
  &__notice,
  &__error {
    display: block;
    margin-top: 24rpx;
    font-size: 23rpx;
    line-height: 1.65;
  }

  &__notice {
    color: tokens.$color-text-muted;
  }

  &__error {
    color: tokens.$color-danger;
  }

  &__actions {
    display: grid;
    margin-top: 26rpx;
    gap: 12rpx;
  }
}
</style>
