<script setup lang="ts">
import { onHide, onShow, onUnload } from '@dcloudio/uni-app'
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import NetworkReconnectDialog from '@/components/network-reconnect-dialog/network-reconnect-dialog.vue'
import HomeDashboard from '@/features/home/components/home-dashboard.vue'
import HomeEntryPage from '@/features/home/components/home-entry-page.vue'
import HomeNavigation from '@/features/home/components/home-navigation.vue'
import { useHomePage } from '@/features/home/use-home-page'
import TabPageLayout from '@/layouts/tab-page-layout.vue'
import { navigate } from '@/shared/navigation/navigate'

import type { HomePageMode } from '@/shared/enums/home'

const props = withDefaults(
  defineProps<{
    mode?: HomePageMode
    networkError?: boolean
  }>(),
  { mode: 'normal', networkError: false }
)

const { cancel, canStartTask, home, load, openSceneCount, retry, startTask, taskScene } =
  useHomePage()
const forcedNetworkError = ref(props.networkError)
const isFirstVisit = computed(
  () =>
    props.mode === 'first' ||
    (home.data?.today_task?.kind === 'NEW_SCENE' && home.data.checkins.total_days === 0)
)

/** 页面显示时刷新首页快照，确保打卡和任务状态及时同步 */
const handleShow = () => {
  void load()
}

/** 同步兼容入口状态，value 表示入口携带的网络异常标记 */
const handleNetworkErrorChange = (value: boolean) => {
  forcedNetworkError.value = value
}

/** 关闭当前页网络错误弹窗，不修改学习数据 */
const handleCloseError = () => {
  forcedNetworkError.value = false
  home.dismissError()
}

/** 重新请求首页数据，成功后错误状态自然关闭 */
const handleRetry = async () => {
  forcedNetworkError.value = false
  await retry()
}

/** 打开顶部品牌入口对应的站内消息列表 */
const openMessages = async () => {
  await navigate({ type: 'navigateTo', url: '/sub-packages/feedback/messages' })
}

/** 复习入口进入收藏银行，继续沿用一级页面导航 */
const openReview = async () => {
  await navigate({ type: 'reLaunch', url: '/sub-packages/favorites/index' })
}

watch(() => props.networkError, handleNetworkErrorChange)
onShow(handleShow)
onHide(cancel)
onUnload(cancel)
onBeforeUnmount(cancel)
</script>

<template>
  <HomeEntryPage v-if="isFirstVisit && !home.error && !forcedNetworkError" mode="first" embedded />
  <HomeEntryPage v-else-if="mode === 'today'" mode="today" />
  <TabPageLayout v-else class="home-page-view" active="home" appearance="home">
    <HomeNavigation
      :unread-message-count="home.view.unreadMessageCount"
      @open-messages="openMessages"
    />
    <HomeDashboard
      :can-start-task="canStartTask"
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
