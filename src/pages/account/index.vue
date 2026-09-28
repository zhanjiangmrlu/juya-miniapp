<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'

import AppButton from '@/components/app-button/app-button.vue'
import AppPage from '@/components/app-page/app-page.vue'
import PageHeader from '@/components/page-header/page-header.vue'
import { shouldGateStartupForDeletion } from '@/features/account/deletion-presenter'
import { getRuntimeServices } from '@/services/runtime'
import { navigate } from '@/shared/navigation/navigate'

const loading = ref(true)

/** 读取本人注销状态；处于冷静期时优先进入撤回页面。 */
async function loadAccountState() {
  loading.value = true
  try {
    const profile = await getRuntimeServices().profile.get()
    if (shouldGateStartupForDeletion(profile.deletion))
      await navigate({ type: 'redirectTo', url: '/pages/account/deletion-pending' })
  } finally {
    loading.value = false
  }
}

/** 打开清空学习数据影响确认页。 */
async function openClearData() {
  await navigate({ type: 'navigateTo', url: '/pages/account/clear-confirm' })
}

/** 打开注销挽留与二次确认页。 */
async function openDeletion() {
  await navigate({ type: 'navigateTo', url: '/pages/account/delete-confirm' })
}

onShow(loadAccountState)
</script>

<template>
  <AppPage>
    <PageHeader eyebrow="清楚区分两种操作" title="数据与账号" />
    <view v-if="!loading" class="account-page">
      <view class="account-page__card">
        <text class="account-page__title">清空学习数据</text>
        <text class="account-page__description">清空收藏、进度和打卡，不删除账号和权益。</text>
        <AppButton label="查看影响" variant="secondary" @press="openClearData" />
      </view>
      <view class="account-page__card account-page__card--danger">
        <text class="account-page__title">注销账号</text>
        <text class="account-page__description">
          进入 7 天可撤回期，届满后删除或匿名化个人数据。
        </text>
        <AppButton label="注销账号" variant="danger" @press="openDeletion" />
      </view>
    </view>
  </AppPage>
</template>

<style scoped lang="scss">
@use '@/styles/mixins.scss' as mixins;
@use '@/styles/tokens.scss' as tokens;

.account-page {
  display: grid;
  gap: 24rpx;

  @include mixins.tablet {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  &__card {
    padding: 30rpx;
    border: 2rpx solid tokens.$color-border;
    border-radius: tokens.$radius-large;
    background: rgb(255 255 255 / 78%);

    &--danger {
      border-color: rgb(189 95 89 / 42%);
      background: #fff8f6;
    }
  }

  &__title,
  &__description {
    display: block;
  }

  &__title {
    font-size: 31rpx;
    font-weight: 700;
  }

  &__description {
    margin: 12rpx 0 24rpx;
    color: tokens.$color-text-muted;
    font-size: 24rpx;
    line-height: 1.6;
  }
}
</style>
