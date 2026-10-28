<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'

import AppBottomTabs from '@/components/app-bottom-tabs/app-bottom-tabs.vue'
import AppPage from '@/components/app-page/app-page.vue'
import AppState from '@/components/app-state/app-state.vue'
import { getListeningHome } from '@/features/listening/listening-service'
import { STATIC_ASSET_BASE_URL } from '@/shared/constants/brand'
import { Routes } from '@/shared/constants/navigation'
import { useAccountStore } from '@/stores/account-store'

import type { ListeningHome } from '@/shared/types/listening'
const homeBackgroundUrl = `${STATIC_ASSET_BASE_URL}/static/listening/home-watercolor@3x.jpg`
const account = useAccountStore(),
  home = ref<ListeningHome | null>(null),
  busy = ref(false),
  error = ref('')
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
/** 打开选定的真实学习模块
 * @param path 场景或主题听读的已注册页面
 */
const open = (path: string) => uni.navigateTo({ url: path })
onShow(() => {
  uni.hideTabBar({ animation: false, fail: () => undefined })
  void load()
})
</script>
<template>
  <AppPage title="句芽英语" class="home-page" footer
    ><image class="home-background" :src="homeBackgroundUrl" mode="widthFix" aria-hidden="true" />
    <view class="hero"
      ><text class="hello">{{ account.profile?.nickname || '学习者' }}，今天也学一点</text
      ><text class="welcome">今天，想学些什么？</text
      ><text class="intro">从真实场景，到连贯阅读。</text></view
    ><AppState :busy="busy && !home" :error="error" @retry="load" /><button
      class="module scene-module"
      @click="open(Routes.LEARNING)"
    >
      <image src="/static/design/book-active.svg" mode="aspectFit" /><text class="module-title"
        >场景学习</text
      ><text class="module-en">English, every day.</text
      ><text class="description">在生活里的对话中，<br />一起积累词汇和语块。</text
      ><view class="module-foot"
        ><text v-if="home"
          >已学{{ home.statistics.completed_cards }}张 ·
          {{
            home?.scene_free_count === null
              ? '免费范围准备中'
              : `免费开放${home.scene_actual_free_count}张`
          }}</text
        ><text>进入场景 →</text></view
      ></button
    ><button class="module listening-module" @click="open(Routes.LISTENING)">
      <image src="/static/design/listening-headphones.svg" mode="aspectFit" /><text
        class="module-title"
        >主题听读</text
      ><text class="module-en">Read. Listen. Keep it.</text
      ><text class="description">读一篇短文，听完整英文，<br />把表达带进自己的生活。</text
      ><view class="module-foot"
        ><text v-if="home"
          >已学{{ home.statistics.completed_articles }}篇 ·
          {{
            home?.free_count === null ? '免费范围准备中' : `免费开放${home.actual_free_count}篇`
          }}</text
        ><text>开始听读 →</text></view
      ></button
    ><view v-if="home" class="home-note"
      ><image src="/static/design/home-checkin.svg" mode="aspectFit" aria-hidden="true" /><text
        >连续打卡{{ home.statistics.current_streak }}天 ·
        {{ home.statistics.checked_in_today ? '今日已打卡' : '今日待打卡' }}</text
      ></view
    ><AppBottomTabs active="home"
  /></AppPage>
</template>
<style scoped lang="scss">
.home-page {
  background: #fffcf5;

  .home-background {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    pointer-events: none;
  }

  .hero,
  .home-note {
    position: relative;
  }

  :deep(.page-nav) {
    background: transparent;
  }

  :deep(.page-body) {
    padding-top: 0;
  }

  .hero {
    padding: 36rpx 0 50rpx;
  }

  text {
    display: block;
  }

  .hello {
    font-size: 25rpx;
    color: #586c5b;
    line-height: 1.5;
  }

  .welcome {
    margin: 20rpx 0 10rpx;
    font-size: 50rpx;
    line-height: 1.5;
    font-weight: 600;
  }

  .intro {
    color: #586c5b;
    font-size: 25rpx;
    line-height: 1.8;
  }

  .module {
    position: relative;
    display: block;
    min-height: 406rpx;
    margin-bottom: 30rpx;
    padding: 40rpx 38rpx;
    border: 1px solid #d5e1c7;
    border-radius: 27rpx;
    background: #e4f0dbdb;
    text-align: left;
    color: #2b4438;

    image {
      position: absolute;
      top: 48rpx;
      right: 38rpx;
      width: 62rpx;
      height: 62rpx;
    }

    .module-title {
      font-size: 44rpx;
      font-weight: 600;
      line-height: 1.5;
    }

    .module-en {
      margin-top: 7rpx;
      font-family: var(--app-serif-font, Georgia, serif);
      font-size: 36rpx;
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
      margin-top: 34rpx;
      font-size: 23rpx;
      line-height: 1.5;
    }
  }

  .listening-module {
    border-color: #dfe5d8;
    background: #fffcf5e6;
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
