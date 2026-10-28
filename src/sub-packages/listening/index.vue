<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

import AppPage from '@/components/app-page/app-page.vue'
import AppState from '@/components/app-state/app-state.vue'
import { getListeningHome, openListeningArticle } from '@/features/listening/listening-service'
import { Routes } from '@/shared/constants/navigation'
import { useAccountStore } from '@/stores/account-store'

import type { ListeningHome, ListeningTopic } from '@/shared/types/listening'
const account = useAccountStore(),
  home = ref<ListeningHome | null>(null),
  category = ref(''),
  panel = ref(false),
  busy = ref(false),
  error = ref('')
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
const select = (id: string) => {
  category.value = id
  panel.value = false
  uni.pageScrollTo({ scrollTop: 0, duration: 0 })
}
/** 进入所选主题的篇目列表
 * @param topic 真实主题与所属分类
 */
const open = (topic: ListeningTopic) =>
  uni.navigateTo({
    url: `${Routes.TOPIC}?id=${encodeURIComponent(topic.id)}&name=${encodeURIComponent(topic.name)}`
  })
onShow(() => void load())
</script>
<template>
  <AppPage title="主题听读" back
    ><text class="section-title">让英语连成一段生活</text
    ><text class="muted">围绕一个主题，读懂，也听懂。</text
    ><AppState :busy="busy && !home" :error="error" @retry="load" /><template v-if="home"
      ><view class="category-bar"
        ><scroll-view
          class="category-scroll"
          scroll-x
          :scroll-into-view="'category-' + (category || 'all')"
          ><view class="category-options"
            ><button id="category-all" :class="{ active: !category }" @click="select('')">
              全部</button
            ><button
              v-for="item in home.categories"
              :id="'category-' + item.id"
              :key="item.id"
              :class="{ active: category === item.id }"
              @click="select(item.id)"
            >
              {{ item.name }}
            </button></view
          ></scroll-view
        ><button class="category-toggle" @click="panel = true">分类⌄</button></view
      ><button
        v-if="home.continue_learning"
        class="continue"
        @click="openListeningArticle(home.continue_learning)"
      >
        继续学习 · {{ home.continue_learning.title_zh }} →</button
      ><view v-if="!home.configured" class="notice">主题听读准备中</view
      ><AppState
        :empty="!topics.length"
        title="暂无听读内容"
        description="新的主题正在准备中"
      /><button v-for="topic in topics" :key="topic.id" class="topic" @click="open(topic)">
        <view
          ><text class="topic-title">{{ topic.name }}</text
          ><text class="muted"
            >已学 {{ topic.completed_articles }} / {{ topic.total_articles }} 篇</text
          ></view
        ><text>→</text>
      </button></template
    ><view v-if="panel" class="category-veil" @click="panel = false"
      ><view class="category-panel" @click.stop
        ><view class="between"
          ><text class="section-title">全部分类</text
          ><button class="text-button" @click="panel = false">关闭</button></view
        ><scroll-view scroll-y class="panel-scroll"
          ><button class="all" :class="{ active: !category }" @click="select('')">全部主题</button
          ><view class="category-grid"
            ><button
              v-for="item in home?.categories"
              :key="item.id"
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
.category-bar {
  display: flex;
  margin: 38rpx 0 24rpx;

  .category-scroll {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
  }

  .category-options {
    display: flex;
    gap: 12rpx;
  }

  button {
    flex-shrink: 0;
    min-height: 85rpx;
    padding: 12rpx 24rpx;
    background: transparent;
    font-size: 25rpx;
    border: 0;
  }

  .category-toggle {
    flex: none;
    width: 123rpx;
    padding: 12rpx;
    border-left: 1px solid #dfe5d8;
    border-radius: 0;
  }
}

.active {
  background: #e4f0db;
  color: #2b4438;
}

.continue {
  padding: 22rpx;
  background: #edf2e5;
  font-size: 24rpx;
  text-align: left;
}

.topic {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-top: 24rpx;
  padding: 32rpx;
  border: 1px solid #dfe5d8;
  border-radius: 24rpx;
  background: #fffef9;
  text-align: left;

  text {
    display: block;
    font-size: 24rpx;
  }

  .topic-title {
    margin-bottom: 14rpx;
    font-size: 32rpx;
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

  button {
    min-height: 85rpx;
    font-size: 25rpx;
    white-space: normal;
  }
}
</style>
