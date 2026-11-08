<script setup lang="ts">
import { onHide, onShareAppMessage, onShareTimeline, onShow, onUnload } from '@dcloudio/uni-app'
import { nextTick, ref } from 'vue'

import AppBottomTabs from '@/components/app-bottom-tabs/app-bottom-tabs.vue'
import AppPage from '@/components/app-page/app-page.vue'
import AppState from '@/components/app-state/app-state.vue'
import { getListeningHome } from '@/features/listening/listening-service'
import { onSessionExpired, session } from '@/services/api'
import { loginReturn } from '@/services/login-return'
import { openLogin } from '@/services/navigation'
import { pageShare } from '@/services/page-share'
import { HOME_BACKGROUND_IMAGE_URL } from '@/shared/constants/brand'
import { LISTENING_SERIES } from '@/shared/constants/home'
import { Routes } from '@/shared/constants/navigation'
import { useAccountStore } from '@/stores/account-store'

import type { ListeningHome } from '@/shared/types/listening'

const account = useAccountStore(),
  home = ref<ListeningHome | null>(null),
  scrollTop = ref(0),
  busy = ref(false),
  error = ref(''),
  refreshing = ref(false)
let generation = 0,
  visible = false
/** 读取本人双模块入口，不将读取失败展示为零成绩 */
const load = async () => {
  busy.value = true
  error.value = ''
  const run = ++generation
  try {
    await account.restore()
    const value = await getListeningHome()
    if (run === generation) home.value = value
  } catch (reason) {
    if (run === generation) error.value = reason instanceof Error ? reason.message : '首页暂未获取'
  } finally {
    if (run === generation) busy.value = false
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
  visible = true
  loginReturn.register(
    Routes.HOME,
    () => ({
      page: Routes.HOME,
      type: 'page',
      id: '',
      tab: '',
      category: '',
      scroll: scrollTop.value,
      translation: false,
      audioPosition: 0,
      playbackRate: 1,
      version: ''
    }),
    () => {
      if (visible) void load()
    }
  )
  const restored = loginReturn.take(Routes.HOME)
  if (restored) scrollTop.value = restored.scroll
  uni.hideTabBar({ animation: false, fail: () => undefined })
  void load()
})

const unsubscribe = onSessionExpired(() => {
  generation++
  home.value = null
  error.value = ''
  busy.value = false
  if (visible && !loginReturn.pending())
    void nextTick(() => {
      if (visible && !loginReturn.pending()) void load()
    })
})
onHide(() => {
  visible = false
})
onUnload(() => {
  generation++
  visible = false
  unsubscribe()
})

onShareAppMessage(() => ({ ...pageShare.friends }))
onShareTimeline(() => ({ ...pageShare.timeline }))
</script>
<template>
  <AppPage
    title="句芽英语"
    class="home-page"
    :background-image="HOME_BACKGROUND_IMAGE_URL"
    fixed-viewport
    ><scroll-view
      class="home-scroll"
      scroll-y
      :scroll-top="scrollTop"
      enhanced
      :show-scrollbar="false"
      refresher-enabled
      :refresher-triggered="refreshing"
      refresher-background="transparent"
      @scroll="scrollTop = $event.detail.scrollTop"
      @refresherrefresh="pullRefresh"
      ><view class="hero"
        ><text class="hello">{{
          account.profile
            ? `${account.profile.nickname || '学习者'}，今天也学一点`
            : '今天，也学一点英语'
        }}</text
        ><text class="welcome">今天，想学些什么？</text></view
      ><AppState :busy="busy && !home" :error="error" @retry="load" /><button
        class="module scene-module"
        @click="open(Routes.LEARNING)"
      >
        <image src="/static/design/book-active.svg" mode="aspectFit" /><text class="module-title"
          >雅思词汇</text
        ><text class="module-en">IELTS Vocabulary</text
        ><view class="description"
          ><text class="description-line scope-description"
            ><text class="scope-number">246</text>张场景卡，覆盖约<text class="scope-number"
              >3,600</text
            >个核心词汇，<text class="scope-cumulative"
              >累计<text class="scope-number">9,840</text>次词汇呈现。</text
            ></text
          ><text class="description-line method-description"
            >看图文、听音频，在场景对话中反复巩固词汇。</text
          ><view class="notes-description"
            ><image
              class="notes-icon"
              src="/static/design/study-note-label.svg"
              mode="aspectFit"
            /><text
              ><text class="notes-emphasis">配套246篇精读笔记</text
              >，逐句翻译、解析搭配，帮你读懂句子、学会表达。</text
            ></view
          ></view
        ><view class="module-foot"
          ><text v-if="home"
            ><template v-if="home.statistics"
              >已学{{ home.statistics.completed_cards }}张 ·
            </template>
            {{
              home?.scene_free_count === null
                ? '免费范围准备中'
                : `免费开放${home.scene_actual_free_count}张${home.statistics ? '' : ' · 直接体验'}`
            }}</text
          ><text class="module-start">开始学习 →</text></view
        ></button
      ><button class="module listening-module" @click="open(Routes.LISTENING)">
        <image src="/static/design/listening-headphones.svg" mode="aspectFit" /><text
          class="module-title"
          >主题听读</text
        ><view class="description listening-description"
          ><view v-for="series in LISTENING_SERIES" :key="series.title" class="description-group"
            ><text class="series-title" :class="{ 'cn-title': 'chinese' in series }">{{
              series.title
            }}</text
            ><text class="description-line"
              >{{ series.prefix }}<text class="series-emphasis">{{ series.emphasis }}</text
              >{{ series.suffix }}</text
            ></view
          ></view
        ><view class="module-foot"
          ><text v-if="home"
            ><template v-if="home.statistics"
              >已学{{ home.statistics.completed_articles }}篇 ·
            </template>
            {{
              home?.free_count === null
                ? '免费范围准备中'
                : `免费开放${home.actual_free_count}篇${home.statistics ? '' : ' · 直接体验'}`
            }}</text
          ><text class="module-start">开始听读 →</text></view
        ></button
      ><view v-if="home?.statistics" class="home-note"
        ><image src="/static/design/home-checkin.svg" mode="aspectFit" aria-hidden="true" /><text
          >连续打卡{{ home.statistics.current_streak }}天 ·
          {{ home.statistics.checked_in_today ? '今日已打卡' : '今日待打卡' }}</text
        ></view
      ><view v-if="!account.profile && !session.userId()" class="guest-home-login"
        ><button class="text-button" @click="openLogin(Routes.HOME)">
          登录，保存学习记录
        </button></view
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
    min-height: 0;
    margin-bottom: 26.923rpx;
    padding: 38.462rpx;
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
      font-size: 32.692rpx;
      font-weight: 400;
      line-height: 1.5;
    }

    .description {
      margin-top: 22rpx;
      font-size: 23.077rpx;
      line-height: 1.85;
    }

    .module-foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12rpx;
      margin-top: 26.923rpx;
      font-size: 21.154rpx;
      line-height: 1.5;
      color: #586c5b;
    }
  }

  .module-start {
    font-size: 23.077rpx;
    font-weight: 700;
    color: #2b4438;
  }

  .listening-module {
    border-color: #dfe5d8;
    background: #fffcf5e6;

    .description {
      display: flex;
      flex-direction: column;
      gap: 0;
      margin-top: 15.385rpx;
    }
  }

  .scope-number {
    font-size: 26.923rpx;
    font-weight: 500;
  }

  .scope-cumulative {
    display: block;
  }

  .method-description {
    margin-top: 13.462rpx;
    color: #41664d;
  }

  .notes-description {
    display: flex;
    align-items: flex-start;
    gap: 17.308rpx;
    margin-top: 23.077rpx;
    padding-top: 23.077rpx;
    border-top: 1px solid #cbdcbd;
    color: #41664d;

    .notes-icon {
      position: static;
      flex: none;
      width: 34.615rpx;
      height: 34.615rpx;
    }
  }

  .notes-emphasis {
    color: #2b4438;
    font-weight: 700;
  }

  .description-group {
    padding: 15.385rpx 0;
    border-bottom: 1px solid #dfe5d8;

    &:last-child {
      border-bottom: 0;
      padding-bottom: 0;
    }

    .series-title {
      display: block;
      font-family: var(--app-serif-font, Georgia, serif);
      font-size: 28.846rpx;
      line-height: 1.4;
      margin-bottom: 7.692rpx;
    }

    .cn-title {
      font-family: inherit;
      font-size: 26.923rpx;
    }

    .description-line {
      color: #586c5b;
      line-height: 1.6;
    }

    .series-emphasis {
      font-weight: 700;
      color: #41664d;
    }
  }

  .guest-home-login {
    display: flex;
    justify-content: center;
    padding: 8px 0 16px;

    button {
      min-height: 44px;
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
