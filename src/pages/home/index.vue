<script setup lang="ts">
import { onLoad, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import { ref } from 'vue'

import HomePageView from '@/features/home/components/home-page-view.vue'
import { useAnalyticsPage } from '@/services/analytics/use-analytics-page'
import { ShareTarget } from '@/shared/enums/sharing'
import { usePageScrollLock } from '@/shared/use-page-scroll-lock'
import { useWechatShare } from '@/shared/use-wechat-share'

const networkError = ref(false)

/** 读取旧入口传入的网络错误标记，并在首页当前页展示弹窗。 */
function handleLoad(query?: Record<string, string>) {
  networkError.value = query?.networkError === '1'
}

onLoad(handleLoad)
const { pageStyle } = usePageScrollLock()
useAnalyticsPage('pages/home/index')
useWechatShare({ target: ShareTarget.HOME }, { onShareAppMessage, onShareTimeline })
</script>

<template>
  <!-- #ifdef MP-WEIXIN -->
  <page-meta :page-style="pageStyle" />
  <!-- #endif -->
  <HomePageView :network-error="networkError" />
</template>
