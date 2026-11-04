<script setup lang="ts">
import { onLoad, onShareAppMessage, onShareTimeline, onShow, onUnload } from '@dcloudio/uni-app'
import { ref } from 'vue'

import AppPage from '@/components/app-page/app-page.vue'
import AppState from '@/components/app-state/app-state.vue'
import { usePageShareEntry } from '@/composables/use-page-share-entry'
import SceneListFooter from '@/features/learning/components/scene-list-footer.vue'
import ListeningArticleCard from '@/features/listening/components/listening-article-card.vue'
import { listeningResumeText } from '@/features/listening/listening-presenter'
import { openListeningArticle } from '@/features/listening/listening-service'
import { pageShare } from '@/services/page-share'
import { PageBackgroundKind } from '@/shared/enums/ui'
import ListeningCategorySummary from '@/sub-packages/listening/components/listening-category-summary.vue'
import { useListeningCatalog } from '@/sub-packages/listening/use-listening-catalog'

const pageShareEntry = usePageShareEntry()
const panel = ref(false)
const {
  home,
  category,
  scrollTop,
  busy,
  error,
  refreshing,
  selectedCategory,
  articles,
  list,
  load,
  loadHome,
  select: selectCategory,
  pullRefresh,
  dispose
} = useListeningCatalog()
/** 选择分类后收起弹层并加载真实文章
 * @param id 真实分类身份，空值为全部
 */
const select = async (id: string) => {
  panel.value = false
  await selectCategory(id)
}
/** 记录列表滚动位置供详情返回恢复
 * @param event 原生文章列表滚动事件
 */
const onListScroll = (event: { detail: { scrollTop: number } }) => {
  scrollTop.value = event.detail.scrollTop
}
onLoad((query) => {
  if (pageShareEntry.value) return
  if (query?.category_id) category.value = query.category_id
})
onShow(() => {
  if (pageShareEntry.value) return
  void load()
})
onUnload(dispose)

onShareAppMessage(() => ({ ...pageShare.friends }))
onShareTimeline(() => ({ ...pageShare.timeline }))
</script>
<template>
  <AppPage :background-kind="PageBackgroundKind.LISTENING" title="主题听读" back fixed-viewport
    ><view class="listening-header"
      ><text class="listening-title">让英语连成一段生活</text
      ><text class="listening-subtitle">从一个分类开始，读懂，也听懂。</text
      ><AppState :busy="busy && !home" :error="error" @retry="loadHome" />
      <template v-if="home"
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
            ><text class="continue-meta">{{ home.continue_learning.category_name }}</text></view
          > </view
        ><view class="category-bar"
          ><scroll-view
            class="category-scroll"
            scroll-x
            enhanced
            :show-scrollbar="false"
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
                {{ item.name_en || item.name }}
              </button></view
            ></scroll-view
          ><button class="category-toggle" @click="panel = true">分类⌄</button></view
        ></template
      ></view
    >
    <scroll-view
      class="article-scroll"
      scroll-y
      enhanced
      :show-scrollbar="false"
      :scroll-top="scrollTop"
      refresher-enabled
      :refresher-triggered="refreshing"
      refresher-background="transparent"
      @scroll="onListScroll"
      @scrolltolower="list.more"
      @refresherrefresh="pullRefresh"
    >
      <AppState
        :busy="list.busy.value && list.total.value === null"
        :error="list.error.value"
        centered-error
        @retry="list.refresh" />
      <template v-if="list.total.value !== null">
        <view class="list-heading"
          ><text>{{
            selectedCategory ? selectedCategory.name_en || selectedCategory.name : '全部文章'
          }}</text
          ><text v-if="list.total.value !== null">{{ list.total.value }}篇</text></view
        >
        <ListeningCategorySummary v-if="selectedCategory" :category="selectedCategory" />
        <AppState
          :empty="list.total.value === 0"
          prominent
          title="这个分类还没有内容"
          description="新的文章正在准备中，可以先看看其他分类。"
          icon="/static/listening/r17-empty-book.svg"
          action-label="查看全部文章"
          @action="select('')"
        />
        <ListeningArticleCard v-for="article in articles" :key="article.id" :article="article" />
        <SceneListFooter
          :busy="list.moreBusy.value"
          :error="list.moreError.value"
          :has-more="list.hasMore.value"
          :done="list.done.value"
          @more="list.more"
        /> </template></scroll-view
    ><view v-if="panel" class="category-veil" @click="panel = false"
      ><view class="category-panel" @click.stop
        ><view class="between"
          ><text class="section-title">全部分类</text
          ><button class="text-button panel-close" @click="panel = false">关闭</button></view
        ><scroll-view scroll-y enhanced :show-scrollbar="false" class="panel-scroll"
          ><button class="all" :class="{ active: !category }" @click="select('')">全部文章</button
          ><view class="category-grid"
            ><button
              v-for="item in home?.categories"
              :key="item.id"
              class="panel-option"
              :class="{ active: category === item.id }"
              @click="select(item.id)"
            >
              {{ item.name_en || item.name }}
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

.article-scroll {
  flex: 1;
  height: 0;
  min-height: 0;
}

.list-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  padding: 18rpx 0;
  font-size: 28.846rpx;
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
