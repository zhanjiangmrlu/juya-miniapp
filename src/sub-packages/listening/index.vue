<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { computed, nextTick, ref } from 'vue'

import AppPage from '@/components/app-page/app-page.vue'
import AppState from '@/components/app-state/app-state.vue'
import { listeningResumeText } from '@/features/listening/listening-presenter'
import { getListeningHome, openListeningArticle } from '@/features/listening/listening-service'
import { Routes } from '@/shared/constants/navigation'
import { PageBackgroundKind } from '@/shared/enums/ui'
import { useAccountStore } from '@/stores/account-store'

import type { ListeningHome, ListeningTopic } from '@/shared/types/listening'
const account = useAccountStore(),
  home = ref<ListeningHome | null>(null),
  category = ref(''),
  panel = ref(false),
  busy = ref(false),
  error = ref(''),
  scrollTop = ref(0),
  refreshing = ref(false)
const continueTopic = computed(() =>
  home.value?.topics.find((topic) => topic.id === home.value?.continue_learning?.topic_id)
)
const topics = computed(
  () =>
    home.value?.topics.filter((topic) => !category.value || topic.category_id === category.value) ||
    []
)
/** 从服务端读取有效分类和主题，保留上次分类 */
const load = async () => {
  busy.value = true
  error.value = ''
  try {
    if (await account.ensure(Routes.LISTENING)) home.value = await getListeningHome()
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '听读暂未获取'
  } finally {
    busy.value = false
  }
}
/** 切换分类并确保横向标签可见，主动切换列表回顶部
 * @param id 真实分类身份，空值为全部
 */
const select = async (id: string) => {
  category.value = id
  panel.value = false
  await nextTick()
  scrollTop.value = 0
}
/** 记录容器位置以确保每次切换分类均能回到顶部
 * @param event 主题列表的滚动事件
 */
const onListScroll = (event: { detail: { scrollTop: number } }) => {
  scrollTop.value = event.detail.scrollTop
}
/** 列表内下拉重新获取主题并收起刷新提示 */
const pullRefresh = async () => {
  if (refreshing.value) return
  refreshing.value = true
  try {
    await load()
  } finally {
    refreshing.value = false
  }
}
/** 进入所选主题的篇目列表
 * @param topic 真实主题与所属分类
 */
const open = (topic: ListeningTopic) =>
  uni.navigateTo({
    url: `${Routes.TOPIC}?id=${encodeURIComponent(topic.id)}&name=${encodeURIComponent(topic.name_en || topic.name)}`
  })
onShow(() => void load())
</script>
<template>
  <AppPage :background-kind="PageBackgroundKind.LISTENING" title="主题听读" back fixed-viewport
    ><view class="listening-header"
      ><text class="listening-title">让英语连成一段生活</text
      ><text class="listening-subtitle">围绕一个主题，读懂，也听懂。</text
      ><template v-if="home"
        ><view v-if="home.continue_learning" class="continue">
          <view class="continue-label"
            ><image
              class="continue-clock"
              src="/static/listening/r17-clock.svg"
              mode="aspectFit"
            /><text>继续学习</text></view
          ><text class="continue-title">{{ home.continue_learning.title_zh }}</text>
          <text class="continue-meta"
            >{{ home.continue_learning.word_count }}词<text v-if="home.continue_learning.progress">
              · {{ listeningResumeText(home.continue_learning) }}</text
            ></text
          >
          <view class="continue-bottom"
            ><button class="continue-action" @click="openListeningArticle(home.continue_learning)">
              <image
                class="continue-play"
                src="/static/listening/r17-play.svg"
                mode="aspectFit"
              />继续阅读</button
            ><text class="continue-meta">{{ continueTopic?.name }}</text></view
          > </view
        ><view class="category-bar"
          ><scroll-view
            class="category-scroll"
            scroll-x
            :scroll-into-view="'category-' + (category || 'all')"
            ><view class="category-options"
              ><button
                id="category-all"
                class="category-option"
                :class="{ active: !category }"
                @click="select('')"
              >
                全部</button
              ><button
                v-for="item in home.categories"
                :id="'category-' + item.id"
                :key="item.id"
                class="category-option"
                :class="{ active: category === item.id }"
                @click="select(item.id)"
              >
                {{ item.name }}
              </button></view
            ></scroll-view
          ><button class="category-toggle" @click="panel = true">分类⌄</button></view
        ></template
      ></view
    >
    <scroll-view
      class="topic-scroll"
      scroll-y
      :scroll-top="scrollTop"
      refresher-enabled
      :refresher-triggered="refreshing"
      refresher-background="transparent"
      @scroll="onListScroll"
      @refresherrefresh="pullRefresh"
    >
      <AppState :busy="busy && !home" :error="error" centered-error @retry="load" />
      <template v-if="home"
        ><view v-if="!home.configured" class="notice">主题听读准备中</view
        ><AppState
          :empty="!topics.length"
          prominent
          title="这个分类还没有内容"
          description="新的主题正在准备中，可以先看看其他分类。"
          icon="/static/listening/r17-empty-book.svg"
          action-label="查看全部主题"
          @action="select('')" /><button
          v-for="topic in topics"
          :key="topic.id"
          class="topic"
          @click="open(topic)"
        >
          <view class="topic-line"
            ><view class="topic-heading"
              ><text class="topic-title">{{ topic.name_en || topic.name }}</text
              ><text v-if="topic.name_en && topic.name" class="topic-chinese">{{
                topic.name
              }}</text></view
            ><image
              class="topic-arrow"
              src="/static/listening/r17-topic-chevron.svg"
              mode="aspectFit"
          /></view>
          <text v-if="topic.description" class="topic-description">{{ topic.description }}</text>
          <view class="topic-counts"
            ><text>{{ topic.total_articles }}篇短文</text
            ><text>已学{{ topic.completed_articles }}／{{ topic.total_articles }}篇</text></view
          >
          <view class="topic-progress"
            ><view
              class="topic-progress-fill"
              :style="{
                width: `${topic.total_articles ? Math.min(100, (topic.completed_articles / topic.total_articles) * 100) : 0}%`
              }"
          /></view></button></template></scroll-view
    ><view v-if="panel" class="category-veil" @click="panel = false"
      ><view class="category-panel" @click.stop
        ><view class="between"
          ><text class="section-title">全部分类</text
          ><button class="text-button panel-close" @click="panel = false">关闭</button></view
        ><scroll-view scroll-y class="panel-scroll"
          ><button class="all" :class="{ active: !category }" @click="select('')">全部主题</button
          ><view class="category-grid"
            ><button
              v-for="item in home?.categories"
              :key="item.id"
              class="panel-option"
              :class="{ active: category === item.id }"
              @click="select(item.id)"
            >
              {{ item.name }}
            </button></view
          ></scroll-view
        ></view
      ></view
    ></AppPage
  >
</template>
<style scoped lang="scss">
.listening-header {
  flex-shrink: 0;
}

.topic-scroll {
  flex: 1;
  height: 0;
  min-height: 0;
}

.listening-title {
  display: block;
  font-size: 42.308rpx;
  line-height: 1.5;
  font-weight: 700;
  margin-bottom: 11.538rpx;
}

.listening-subtitle {
  display: block;
  color: #586c5b;
  font-size: 25rpx;
  line-height: 1.8;
}

.category-bar {
  display: flex;
  margin: 42rpx 0 24rpx;
  gap: 19.231rpx;

  .category-scroll {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
  }

  .category-options {
    display: flex;
    gap: 12rpx;
  }

  .category-option {
    flex-shrink: 0;
    min-height: 44px;
    padding: 12rpx 24rpx;
    background: #fff;
    font-size: 26.923rpx;
    border: 1px solid #dfe5d8;
    border-radius: 22px;

    &.active {
      background: #e4f0db;
      border-color: #e4f0db;
      color: #2b4438;
    }
  }

  .category-toggle {
    flex: none;
    width: 64px;
    min-width: 64px;
    min-height: 44px;
    padding: 12rpx;
    border: 1px solid #dfe5d8;
    border-radius: 19.231rpx;
    background: #fffcf5;
    font-size: 25rpx;
  }
}

.active {
  background: #e4f0db;
  color: #2b4438;
}

.continue {
  margin-top: 34.615rpx;
  padding: 32.692rpx;
  background: #e4f0db;
  border-radius: 23.077rpx;

  .continue-clock {
    width: 15px;
    height: 15px;
  }

  .continue-play {
    width: 18px;
    height: 18px;
  }

  .continue-label {
    display: flex;
    align-items: center;
    gap: 11.538rpx;
    color: #41664d;
    font-size: 23.077rpx;
  }

  .continue-title {
    display: block;
    margin: 15.385rpx 0 13.462rpx;
    font-size: 30.769rpx;
    font-weight: 700;
  }

  .continue-meta {
    font-size: 23.077rpx;
    color: #586c5b;
  }

  .continue-bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 21.154rpx;
  }

  .continue-action {
    display: flex;
    align-items: center;
    gap: 13.462rpx;
    min-height: 44px;
    margin: 0;
    padding: 12rpx 26rpx;
    background: #fff;
    font-size: 23.077rpx;
    border: 1px solid #dfe5d8;
  }
}

.topic {
  display: block;
  width: 100%;
  padding: 34.615rpx 0;
  border: 0;
  border-bottom: 1px solid #dfe5d8;
  border-radius: 0;
  background: transparent;
  text-align: left;

  .topic-line {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20rpx;
  }

  .topic-title {
    display: block;
    font-family: var(--app-serif-font, Georgia, serif);
    font-size: 44.231rpx;
    font-weight: 400;
    line-height: 1.24;
  }

  .topic-chinese {
    display: block;
    margin-top: 5.769rpx;
    font-size: 26.923rpx;
    font-weight: 500;
    line-height: 1.5;
  }

  .topic-arrow {
    flex: none;
    width: 17px;
    height: 17px;
  }

  .topic-description {
    display: block;
    margin-top: 15.385rpx;
    font-size: 23.077rpx;
    color: #586c5b;
    line-height: 1.9;
  }

  .topic-counts {
    display: flex;
    justify-content: space-between;
    margin-top: 23.077rpx;
    color: #586c5b;
    font-size: 23.077rpx;
  }

  .topic-progress {
    height: 7.692rpx;
    margin-top: 25rpx;
    overflow: hidden;
    border-radius: 4rpx;
    background: #e8ecdf;
  }

  .topic-progress-fill {
    height: 100%;
    background: #72966a;
  }
}

.category-veil {
  position: fixed;
  z-index: 60;
  inset: 0;
  display: flex;
  align-items: flex-end;
  background: #20362b66;
}

.category-panel {
  width: 100%;
  max-height: 65vh;
  padding: 38rpx 38rpx max(38rpx, env(safe-area-inset-bottom));
  border-radius: 30rpx 30rpx 0 0;
  background: #fffcf5;

  .panel-close {
    min-width: 44px;
    min-height: 44px;
  }

  .panel-scroll {
    max-height: 48vh;
    height: 48vh;
  }

  .all {
    width: 100%;
    margin: 20rpx 0;
    background: #f0f3e9;
  }

  .category-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16rpx;
  }

  .panel-option,
  .all {
    min-height: 44px;
    font-size: 25rpx;
    white-space: normal;
  }
}
</style>
