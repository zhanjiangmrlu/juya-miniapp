<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'

import AppState from '@/components/app-state/app-state.vue'
import ShortReadingPageLayout from '@/features/short-reading/components/short-reading-page-layout.vue'
import ShortReadingPreviewCard from '@/features/short-reading/components/short-reading-preview-card.vue'
import { useShortReadingPage } from '@/features/short-reading/use-short-reading-page'
import { useAnalyticsPage } from '@/services/analytics/use-analytics-page'
import { NavigationType } from '@/shared/enums/navigation'
import { ShortReadingPageStatus } from '@/shared/enums/short-reading'
import { decodePageQuery } from '@/shared/navigation/decode-page-query'
import { navigate } from '@/shared/navigation/navigate'
import { usePageScrollLock } from '@/shared/use-page-scroll-lock'

const { initialize, status, summary } = useShortReadingPage(true)
const { pageStyle } = usePageScrollLock()
useAnalyticsPage('sub-packages/short-reading/preview')
/** 安全预览只读取稳定短文ID，query 为当前页面路由参数 */
const load = (query?: Record<string, string>) => {
  void initialize(decodePageQuery(query?.contentId))
}
/** 返回短文列表，不从安全预览写入阅读进度 */
const returnToList = () =>
  navigate({ type: NavigationType.REDIRECT_TO, url: '/sub-packages/short-reading/index' })
onLoad(load)
</script>

<template>
  <!-- #ifdef MP-WEIXIN -->
  <page-meta :page-style="pageStyle" />
  <!-- #endif -->
  <ShortReadingPageLayout :title="summary?.title_zh || '短文预览'">
    <ShortReadingPreviewCard v-if="summary" :summary="summary" @return-to-list="returnToList" />
    <view v-else class="preview-state"
      ><text v-if="status === ShortReadingPageStatus.LOADING">正在加载预览…</text
      ><AppState
        v-else
        title="短文暂不可用"
        description="请返回学习页查看已开放内容。"
        icon-label="短文不可用"
      /><button @click="returnToList">返回短文列表</button></view
    >
  </ShortReadingPageLayout>
</template>

<style scoped lang="scss">
.preview-state {
  display: flex;
  padding: 20px;
  flex-direction: column;
  gap: 16px;

  button {
    width: 100%;
    min-height: 44px;
    border-radius: 12px;
    background: #4e7f3b;
    color: #fff;
    font-size: 14px;
  }
}
</style>
