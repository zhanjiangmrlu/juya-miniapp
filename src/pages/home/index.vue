<script setup lang="ts">
import { onShareAppMessage, onShareTimeline, onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'

import AppBottomTabs from '@/components/app-bottom-tabs/app-bottom-tabs.vue'
import AppPage from '@/components/app-page/app-page.vue'
import AppState from '@/components/app-state/app-state.vue'
import { getListeningHome } from '@/features/listening/listening-service'
import { pageShare } from '@/services/page-share'
import { Routes } from '@/shared/constants/navigation'
import { useAccountStore } from '@/stores/account-store'

import type { ListeningHome } from '@/shared/types/listening'

const homeBackgroundUrl = '/static/listening/home-watercolor@3x.jpg'
const account = useAccountStore(),
  home = ref<ListeningHome | null>(null),
  busy = ref(false),
  error = ref(''),
  refreshing = ref(false)
/** 读取本人双模块入口，不将读取失败展示为零成绩 */
const load = async () => {
  busy.value = true
  error.value = ''
  try {
    if (await account.ensure(Routes.HOME)) {
      home.value = await getListeningHome()
    }
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '首页暂未获取'
  } finally {
    busy.value = false
  }
}
/** 在首页内容区下拉时刷新入口统计并收起刷新提示 */
const pullRefresh = async () => {
  if (refreshing.value) return
  refreshing.value = true
  try {
    await load()
  } finally {
    refreshing.value = false
  }
}
/** 打开选定的真实学习模块
 * @param path 场景或主题听读的已注册页面
 */
const open = (path: string) => uni.navigateTo({ url: path })
onShow(() => {
  uni.hideTabBar({ animation: false, fail: () => undefined })
  void load()
})

onShareAppMessage(() => ({ ...pageShare.friends }))
onShareTimeline(() => ({ ...pageShare.timeline }))
</script>
<template>
  <AppPage title="句芽英语" class="home-page" :background-image="homeBackgroundUrl" fixed-viewport
    ><scroll-view
      class="home-scroll"
      scroll-y
      enhanced
      :show-scrollbar="false"
      refresher-enabled
      :refresher-triggered="refreshing"
      refresher-background="transparent"
      @refresherrefresh="pullRefresh"
      ><view class="hero"
        ><text class="hello">{{ account.profile?.nickname || '学习者' }}，今天也学一点</text
        ><text class="welcome">今天，想学些什么？</text></view
      ><AppState :busy="busy && !home" :error="error" @retry="load" /><button
        class="module scene-module"
        @click="open(Routes.LEARNING)"
      >
        <image src="/static/design/book-active.svg" mode="aspectFit" /><text class="module-title"
          >雅思词汇</text
        ><text class="module-en">IELTS Vocabulary</text
        ><view class="description"
          ><text class="description-line">结合场景图片和日常对话，</text
          ><text class="description-line">积累约3,700个词汇。</text></view
        ><view class="module-foot"
          ><text v-if="home"
            >已学{{ home.statistics.completed_cards }}张 ·
            {{
              home?.scene_free_count === null
                ? '免费范围准备中'
                : `免费开放${home.scene_actual_free_count}张`
            }}</text
          ><text>开始学习 ›</text></view
        ></button
      ><button class="module listening-module" @click="open(Routes.LISTENING)">
        <image src="/static/design/listening-headphones.svg" mode="aspectFit" /><text
          class="module-title"
          >主题听读</text
        ><view class="description listening-description"
          ><view class="description-group"
            ><text class="description-line">English in Real Life：</text
            ><text class="description-line">涵盖10类日常英语内容。</text></view
          ><view class="description-group"
            ><text class="description-line">IELTS Speaking B2–C1：</text
            ><text class="description-line">涵盖10类口语内容。</text></view
          ><view class="description-group"
            ><text class="description-line">生活场景听读：</text
            ><text class="description-line">约覆盖1.5万—2万词汇。</text></view
          ></view
        ><view class="module-foot"
          ><text v-if="home"
            >已学{{ home.statistics.completed_articles }}篇 ·
            {{
              home?.free_count === null ? '免费范围准备中' : `免费开放${home.actual_free_count}篇`
            }}</text
          ><text>开始听读 ›</text></view
        ></button
      ><view v-if="home" class="home-note"
        ><image src="/static/design/home-checkin.svg" mode="aspectFit" aria-hidden="true" /><text
          >连续打卡{{ home.statistics.current_streak }}天 ·
          {{ home.statistics.checked_in_today ? '今日已打卡' : '今日待打卡' }}</text
        ></view
      ></scroll-view
    ><template #footer><AppBottomTabs active="home" embedded /></template
  ></AppPage>
</template>
<style scoped lang="scss">
.home-page {
  background: #fffcf5;

  .home-scroll {
    flex: 1;
    min-height: 0;
    height: 0;
  }

  .hero,
  .home-note {
    position: relative;
  }

  :deep(.page-nav) {
    background: transparent;
  }

  :deep(.nav-wordmark) {
    font-size: 61.538rpx;
  }

  :deep(.nav-brand) {
    font-size: 28.846rpx;
    font-weight: 700;
  }

  :deep(.page-body) {
    padding-top: 0;
  }

  .hero {
    padding: 36.538rpx 0 38.462rpx;
  }

  .hello,
  .welcome,
  .intro,
  .module-title,
  .module-en,
  .description-line {
    display: block;
  }

  .hello {
    font-size: 25rpx;
    color: #586c5b;
    line-height: 1.5;
  }

  .welcome {
    margin: 25rpx 0 0;
    font-size: 50rpx;
    line-height: 1.5;
    font-weight: 700;
  }

  .intro {
    color: #586c5b;
    font-size: 25rpx;
    line-height: 1.8;
  }

  .module {
    position: relative;
    display: block;
    min-height: 370.731rpx;
    margin-bottom: 26.923rpx;
    padding: 34.615rpx 38.462rpx;
    border: 1px solid #d5e1c7;
    border-radius: 27rpx;
    background: #e4f0dbdb;
    text-align: left;
    color: #2b4438;

    image {
      position: absolute;
      top: 40.385rpx;
      right: 38rpx;
      width: 46.154rpx;
      height: 46.154rpx;
    }

    .module-title {
      font-size: 44rpx;
      font-weight: 700;
      line-height: 1.5;
    }

    .module-en {
      margin-top: 7rpx;
      font-family: var(--app-serif-font, Georgia, serif);
      font-size: 38.462rpx;
      font-weight: 400;
      line-height: 1.5;
    }

    .description {
      margin-top: 22rpx;
      font-size: 25rpx;
      line-height: 1.8;
    }

    .module-foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12rpx;
      margin-top: 26.923rpx;
      font-size: 23.077rpx;
      line-height: 1.5;
    }
  }

  .listening-module {
    border-color: #dfe5d8;
    background: #fffcf5e6;

    .description {
      display: flex;
      flex-direction: column;
      gap: 17.308rpx;
      margin-top: 15.385rpx;
    }
  }

  .home-note {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 15.385rpx;
    margin-top: 34rpx;
    color: #586c5b;
    font-size: 23rpx;

    image {
      flex: none;
      width: 15px;
      height: 15px;
    }
  }
}
</style>
