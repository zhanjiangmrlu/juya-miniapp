<script setup lang="ts">
import { onLoad, onReachBottom, onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

import AppPage from '@/components/app-page/app-page.vue'
import AppState from '@/components/app-state/app-state.vue'
import { useSceneList } from '@/composables/use-scene-list'
import SceneListFooter from '@/features/learning/components/scene-list-footer.vue'
import ListeningArticleCard from '@/features/listening/components/listening-article-card.vue'
import { getListeningHome } from '@/features/listening/listening-service'
import { session } from '@/services/api'
import { LISTENING_API } from '@/shared/constants/listening'
import { Routes } from '@/shared/constants/navigation'
import { useAccountStore } from '@/stores/account-store'

import type { ListeningSummary, ListeningTopic } from '@/shared/types/listening'
const id = ref(''),
  title = ref('主题篇目'),
  account = useAccountStore(),
  topic = ref<ListeningTopic | null>(null),
  resume = ref<ListeningSummary | null>(null)
const permissionLabel = computed(() => {
  const rows = list.items.value
  if (!rows.length) return ''
  return rows.every((item) => item.access.can_learn)
    ? '当前篇目可学习'
    : '免费篇目可直接学习 · 其余需学习授权'
})
const list = useSceneList<ListeningSummary>({
  path: `${LISTENING_API}/topics/current/articles`,
  request: (path, options) =>
    session.request(path.replace('/topics/current/', `/topics/${id.value}/`), options),
  userId: session.userId,
  ensure: () => account.ensure(`${Routes.TOPIC}?id=${id.value}`)
})
const articles = computed(() =>
  list.items.value.map((item) =>
    item.version_id && item.id === resume.value?.id && item.version_id === resume.value.version_id
      ? {
          ...item,
          progress: resume.value.progress,
          reading_paragraph: resume.value.reading_paragraph
        }
      : item
  )
)
onLoad((query) => {
  id.value = query?.id || ''
  title.value = query?.name ? decodeURIComponent(query.name) : '主题篇目'
})
/** 返回全部主题选择其他内容 */
const returnTopics = () => uni.redirectTo({ url: Routes.LISTENING })
/** 刷新真实主题介绍与本人完成数，不从路由猜测主题内容 */
const refresh = async () => {
  await list.refresh()
  if (list.error.value) return
  try {
    const home = await getListeningHome()
    topic.value = home.topics.find((item) => item.id === id.value) || null
    resume.value = home.continue_learning
    if (topic.value) title.value = topic.value.name_en || topic.value.name
  } catch {
    topic.value = null
    resume.value = null
  }
}
onShow(() => {
  if (id.value) void refresh()
})
onReachBottom(() => void list.more())
</script>
<template>
  <AppPage :title="title" back
    ><text v-if="topic?.name_en && topic?.name" class="topic-subtitle">{{ topic.name }}</text
    ><text v-if="topic?.description" class="topic-description">{{ topic.description }}</text
    ><view class="topic-summary"
      ><text class="muted">{{
        list.total.value === null
          ? ''
          : `${list.total.value}篇短文${topic ? ` · 已学${topic.completed_articles}篇` : ''}`
      }}</text
      ><text v-if="permissionLabel" class="permission-label">{{ permissionLabel }}</text></view
    ><view v-if="topic" class="topic-progress"
      ><view
        class="progress-fill"
        :style="{
          width: `${topic.total_articles ? Math.min(100, (topic.completed_articles / topic.total_articles) * 100) : 0}%`
        }" /></view
    ><AppState
      :busy="list.busy.value && list.total.value === null"
      :error="list.error.value"
      :empty="list.total.value === 0"
      title="暂无篇目"
      centered-error
      action-label="返回主题列表"
      @action="returnTopics"
      @retry="refresh"
    /><ListeningArticleCard
      v-for="article in articles"
      :key="article.id"
      :article="article"
    /><SceneListFooter
      :busy="list.moreBusy.value"
      :error="list.moreError.value"
      :has-more="list.hasMore.value"
      :done="list.done.value"
      @more="list.more"
    /><view v-if="list.items.value.length" class="topic-notice"
      >按自己的节奏阅读。主动完成后，记录才会更新。</view
    ></AppPage
  >
</template>

<style scoped lang="scss">
.topic-subtitle {
  display: block;
  font-family: var(--app-serif-font, Georgia, serif);
  font-size: 53.846rpx;
  line-height: 1.5;
}

.topic-description {
  display: block;
  margin-top: 11.538rpx;
  color: #586c5b;
  font-size: 25rpx;
  line-height: 1.8;
}

.topic-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  margin-top: 34.615rpx;
}

.permission-label {
  max-width: 50%;
  padding: 6rpx 13.462rpx;
  background: #e4f0db;
  border-radius: 9.615rpx;
  font-size: 21.154rpx;
  color: #41664d;
}

.topic-progress {
  margin-top: 25rpx;
  height: 7.692rpx;
  background: #e8ecdf;
  border-radius: 4rpx;
  overflow: hidden;

  .progress-fill {
    height: 100%;
    background: #72966a;
  }
}

.topic-notice {
  margin-top: 38.462rpx;
  padding: 23.077rpx 26.923rpx;
  border-radius: 19.231rpx;
  background: #e4f0db;
  font-size: 25rpx;
  line-height: 1.7;
}
</style>
