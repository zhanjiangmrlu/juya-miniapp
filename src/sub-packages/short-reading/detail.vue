<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'

import AppState from '@/components/app-state/app-state.vue'
import tabletPlay from '@/features/short-reading/assets/tablet-play.svg'
import ShortReadingPageLayout from '@/features/short-reading/components/short-reading-page-layout.vue'
import ShortReadingPageView from '@/features/short-reading/components/short-reading-page-view.vue'
import ShortReadingPreviewCard from '@/features/short-reading/components/short-reading-preview-card.vue'
import { shortReadingEntryFromQuery } from '@/features/short-reading/short-reading-entry'
import { useShortReadingPage } from '@/features/short-reading/use-short-reading-page'
import { useAnalyticsPage } from '@/services/analytics/use-analytics-page'
import { AudioStatus } from '@/shared/enums/audio'
import { NavigationType } from '@/shared/enums/navigation'
import { ShortReadingPageStatus } from '@/shared/enums/short-reading'
import { decodePageQuery } from '@/shared/navigation/decode-page-query'
import { navigate } from '@/shared/navigation/navigate'
import { usePageScrollLock } from '@/shared/use-page-scroll-lock'

const {
  audioStatus,
  categorySelected,
  complete,
  completing,
  detail,
  errorMessage,
  initialize,
  initialPosition,
  levelSelected,
  play,
  position,
  savePosition,
  status,
  sourceParagraphId,
  summary,
  toggleTag,
  toggleTranslation,
  translationVisible
} = useShortReadingPage()
const { pageStyle } = usePageScrollLock()
useAnalyticsPage('sub-packages/short-reading/detail')
/** 读取稳定短文路由参数，query 为uni-app传入的页面参数 */
const load = (query?: Record<string, string>) => {
  void initialize(decodePageQuery(query?.contentId), shortReadingEntryFromQuery(query))
}
/** 返回独立短文列表 */
const returnToList = () =>
  navigate({ type: NavigationType.REDIRECT_TO, url: '/sub-packages/short-reading/index' })
onLoad(load)
</script>

<template>
  <!-- #ifdef MP-WEIXIN -->
  <page-meta :page-style="pageStyle" />
  <!-- #endif -->
  <ShortReadingPageLayout :title="summary?.title_zh || '短文阅读'">
    <template #audio
      ><button
        v-if="detail?.whole_audio"
        class="tablet-audio"
        :disabled="audioStatus === AudioStatus.LOADING"
        @click="play"
      >
        <image :src="tabletPlay" class="tablet-play" mode="aspectFit" /><text>{{
          audioStatus === AudioStatus.PLAYING
            ? '暂停全文'
            : audioStatus === AudioStatus.PAUSED
              ? '继续播放'
              : audioStatus === AudioStatus.FAILED
                ? '重试播放'
                : audioStatus === AudioStatus.LOADING
                  ? '正在加载'
                  : '播放全文'
        }}</text>
      </button></template
    >
    <ShortReadingPageView
      v-if="detail"
      :reading="detail"
      :translation-visible="translationVisible"
      :category-selected="categorySelected"
      :level-selected="levelSelected"
      :completing="completing"
      :audio-status="audioStatus"
      :error-message="errorMessage"
      :position="position"
      :initial-position="initialPosition"
      :source-paragraph-id="sourceParagraphId"
      @toggle-tag="toggleTag"
      @toggle-translation="toggleTranslation"
      @play="play"
      @complete="complete"
      @position="savePosition"
    />
    <ShortReadingPreviewCard
      v-else-if="summary && status === ShortReadingPageStatus.PREVIEW"
      :summary="summary"
      @return-to-list="returnToList"
    />
    <view v-else class="reading-state"
      ><text v-if="status === ShortReadingPageStatus.LOADING">正在加载短文…</text
      ><AppState
        v-else
        title="短文暂不可用"
        description="请返回学习页重新确认访问权限。"
        icon-label="短文不可用"
      /><button class="return-list" @click="returnToList">返回短文列表</button></view
    >
  </ShortReadingPageLayout>
</template>

<style scoped lang="scss">
.tablet-audio {
  display: none;

  @media (width >= 700px) {
    display: flex;
    width: 150px;
    min-height: 44px;
    align-items: center;
    justify-content: center;
    margin: 0 20px 0 10px;
    padding: 8px;
    border-radius: 12px;
    background: #e2eed9;
    color: #4e7f3b;
    font-size: 14px;
    line-height: 22px;
    gap: 8px;

    .tablet-play {
      width: 18px;
      height: 18px;
    }

    &::after {
      border: 0;
    }
  }
}

.reading-state {
  display: flex;
  padding: 20px;
  flex-direction: column;
  gap: 16px;

  .return-list {
    width: 100%;
    min-height: 44px;
    border-radius: 12px;
    background: #4e7f3b;
    color: #fff;
    font-size: 14px;
  }
}
</style>
