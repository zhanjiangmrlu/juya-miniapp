<script setup lang="ts">
import { ref } from 'vue'

import AppButton from '@/components/app-button/app-button.vue'
import AppPage from '@/components/app-page/app-page.vue'
import PageHeader from '@/components/page-header/page-header.vue'
import {
  clearLocalLearningData,
  createUniLocalDataScope
} from '@/features/account/local-data-cleaner'
import { getRuntimeServices } from '@/services/runtime'
import { navigate } from '@/shared/navigation/navigate'

const loading = ref(false)
const error = ref('')

/** 取消危险操作并返回数据与账号页。 */
function cancel() {
  uni.navigateBack()
}

/** 等待服务端确认清理成功后，再清空对应本地学习缓存。 */
async function confirmClear() {
  loading.value = true
  error.value = ''
  try {
    await getRuntimeServices().account.clearLearningData()
    clearLocalLearningData(createUniLocalDataScope())
    uni.showToast({ icon: 'success', title: '学习数据已清空' })
    await navigate({ type: 'reLaunch', url: '/pages/profile/index' })
  } catch {
    error.value = '暂时无法清空，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AppPage>
    <PageHeader eyebrow="数据与账号" title="清空学习数据" />
    <view class="clear-confirm">
      <text class="clear-confirm__title">将清空收藏、进度和打卡</text>
      <text class="clear-confirm__description">
        账号、联系资料和当前学习权益不会删除。清空后不可恢复。
      </text>
      <text v-if="error" class="clear-confirm__error">{{ error }}</text>
      <view class="clear-confirm__actions">
        <AppButton :block="false" label="取消" variant="secondary" @press="cancel" />
        <AppButton
          :block="false"
          :loading="loading"
          label="确认清空"
          variant="danger"
          @press="confirmClear"
        />
      </view>
    </view>
  </AppPage>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.clear-confirm {
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
    font-size: 31rpx;
    font-weight: 700;
  }

  &__description {
    margin-top: 14rpx;
    font-size: 24rpx;
    line-height: 1.7;
  }

  &__error {
    margin-top: 16rpx;
    color: tokens.$color-danger;
    font-size: 23rpx;
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 28rpx;
    gap: 16rpx;
  }
}
</style>
