<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'

import { useAnalyticsPage } from '@/services/analytics/use-analytics-page'
import { NavigationType } from '@/shared/enums/navigation'
import { navigate } from '@/shared/navigation/navigate'
import { usePageScrollLock } from '@/shared/use-page-scroll-lock'
const { pageStyle } = usePageScrollLock()
/** 兼容旧词汇／语块入口，query为旧场景身份，不建立独立查词页 */
const redirect = (query?: Record<string, string>) =>
  navigate({
    type: NavigationType.REDIRECT_TO,
    url: `/sub-packages/scene/dialogue?sceneId=${encodeURIComponent(query?.sceneId ?? '')}`
  })
onLoad(redirect)
useAnalyticsPage('sub-packages/scene/vocabulary')
</script>
<template>
  <!-- #ifdef MP-WEIXIN -->
  <page-meta :page-style="pageStyle" />
  <!-- #endif -->
  <view>正在返回场景阅读…</view>
</template>
