<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'

import HomePageView from '@/features/home/components/home-page-view.vue'
import { useAnalyticsPage } from '@/services/analytics/use-analytics-page'
import { usePageScrollLock } from '@/shared/use-page-scroll-lock'

const networkError = ref(false)

/** 读取旧入口传入的网络错误标记，并在首页当前页展示弹窗。 */
function handleLoad(query?: Record<string, string>) {
  networkError.value = query?.networkError === '1'
}

onLoad(handleLoad)
const { pageStyle } = usePageScrollLock()
useAnalyticsPage('pages/home/index')
</script>

<template>
  <!-- #ifdef MP-WEIXIN -->
  <page-meta :page-style="pageStyle" />
  <!-- #endif -->
  <HomePageView :network-error="networkError" />
</template>
