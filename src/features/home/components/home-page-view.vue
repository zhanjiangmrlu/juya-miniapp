<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref, watch } from 'vue'

import NetworkReconnectDialog from '@/components/network-reconnect-dialog/network-reconnect-dialog.vue'
import HomeDashboard from '@/features/home/components/home-dashboard.vue'
import HomeNavigation from '@/features/home/components/home-navigation.vue'
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

const { home, load, openSceneCount, retry, startTask, taskScene } = useHomePage()
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

/** 打开顶部品牌入口对应的站内消息列表。 */
async function openMessages() {
  await navigate({ type: 'navigateTo', url: '/pages/feedback/messages' })
}

/** 复习入口进入收藏银行，继续沿用一级页面导航。 */
async function openReview() {
  await navigate({ type: 'reLaunch', url: '/pages/favorites/index' })
}

watch(() => props.networkError, handleNetworkErrorChange)
onShow(handleShow)
</script>

<template>
  <TabPageLayout class="home-page-view" active="home" appearance="home">
    <HomeNavigation
      :unread-message-count="home.view.unreadMessageCount"
      @open-messages="openMessages"
    />
    <view v-if="mode === 'today'" class="task-sequence">
      <text class="sequence-title">任务顺序</text>
      <text class="sequence-copy">恢复未完成场景 → 完成场景 → 最多 10 张收藏翻卡</text>
    </view>
    <HomeDashboard
      :open-scene-count="openSceneCount"
      :task-scene="taskScene"
      :view="home.view"
      @open-review="openReview"
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
  .task-sequence {
    margin-bottom: tokens.$space-4;
    padding: 24rpx;
    border-radius: tokens.$radius-medium;
    background: rgb(227 239 230 / 76%);
  }

  .sequence-title,
  .sequence-copy {
    display: block;
  }

  .sequence-title {
    color: tokens.$color-primary;
    font-size: 23rpx;
    font-weight: 700;
  }

  .sequence-copy {
    margin-top: 8rpx;
    font-size: 24rpx;
  }
}
</style>
