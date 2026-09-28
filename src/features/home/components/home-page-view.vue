<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref, watch } from 'vue'

import NetworkReconnectDialog from '@/components/network-reconnect-dialog/network-reconnect-dialog.vue'
import HomeDashboard from '@/features/home/components/home-dashboard.vue'
import { useHomePage } from '@/features/home/use-home-page'
import TabPageLayout from '@/layouts/tab-page-layout.vue'
import { navigate } from '@/shared/navigation/navigate'

const props = withDefaults(
  defineProps<{
    mode?: 'first' | 'normal' | 'today'
    networkError?: boolean
  }>(),
  { mode: 'normal', networkError: false }
)

const { featuredScene, home, load, openScene, retry, startTask } = useHomePage()
const forcedNetworkError = ref(props.networkError)

/** 页面显示时刷新首页快照，确保打卡和任务状态及时同步。 */
function handleShow() {
  void load()
}

/** 同步兼容路由传入的网络错误状态。 */
function handleNetworkErrorChange(value: boolean) {
  forcedNetworkError.value = value
}

/** 关闭当前页网络错误弹窗，不修改学习数据。 */
function handleCloseError() {
  forcedNetworkError.value = false
  home.dismissError()
}

/** 重新请求首页数据，成功后错误状态自然关闭。 */
async function handleRetry() {
  forcedNetworkError.value = false
  await retry()
}

/** 打开首页铃铛对应的站内消息列表。 */
async function openMessages() {
  await navigate({ type: 'navigateTo', url: '/pages/feedback/messages' })
}

watch(() => props.networkError, handleNetworkErrorChange)
onShow(handleShow)
</script>

<template>
  <TabPageLayout active="home">
    <view v-if="mode === 'today'" class="home-page-view__sequence">
      <text class="home-page-view__sequence-title">任务顺序</text>
      <text class="home-page-view__sequence-copy"
        >恢复未完成场景 → 完成场景 → 最多 10 张收藏翻卡</text
      >
    </view>
    <HomeDashboard
      :featured-scene="featuredScene"
      :view="home.view"
      @open-messages="openMessages"
      @open-scene="openScene"
      @start-task="startTask"
    />
    <NetworkReconnectDialog
      v-if="forcedNetworkError || home.error"
      @close="handleCloseError"
      @retry="handleRetry"
    />
  </TabPageLayout>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.home-page-view {
  &__sequence {
    margin-bottom: tokens.$space-4;
    padding: 24rpx;
    border-radius: tokens.$radius-medium;
    background: rgb(227 239 230 / 76%);
  }

  &__sequence-title,
  &__sequence-copy {
    display: block;
  }

  &__sequence-title {
    color: tokens.$color-primary;
    font-size: 23rpx;
    font-weight: 700;
  }

  &__sequence-copy {
    margin-top: 8rpx;
    font-size: 24rpx;
  }
}
</style>
