<script setup lang="ts">
import { onLoad, onReachBottom, onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'

import AppPage from '@/components/app-page/app-page.vue'
import AppState from '@/components/app-state/app-state.vue'
import { useSceneList } from '@/composables/use-scene-list'
import SceneListFooter from '@/features/learning/components/scene-list-footer.vue'
import ListeningArticleCard from '@/features/listening/components/listening-article-card.vue'
import { session } from '@/services/api'
import { LISTENING_API } from '@/shared/constants/listening'
import { Routes } from '@/shared/constants/navigation'
import { useAccountStore } from '@/stores/account-store'

import type { ListeningSummary } from '@/shared/types/listening'
const id = ref(''),
  title = ref('主题篇目'),
  account = useAccountStore()
const list = useSceneList<ListeningSummary>({
  path: `${LISTENING_API}/topics/current/articles`,
  request: (path, options) =>
    session.request(path.replace('/topics/current/', `/topics/${id.value}/`), options),
  userId: session.userId,
  ensure: () => account.ensure(`${Routes.TOPIC}?id=${id.value}`)
})
onLoad((query) => {
  id.value = query?.id || ''
  title.value = query?.name ? decodeURIComponent(query.name) : '主题篇目'
})
onShow(() => {
  if (id.value) void list.refresh()
})
onReachBottom(() => void list.more())
</script>
<template>
  <AppPage :title="title" back
    ><text class="section-title">{{ title }}</text
    ><text class="muted">{{
      list.total.value === null ? '' : `共 ${list.total.value} 篇 · 按主题顺序学习`
    }}</text
    ><AppState
      :busy="list.busy.value && list.total.value === null"
      :error="list.error.value"
      :empty="list.total.value === 0"
      title="暂无篇目"
      @retry="list.refresh" /><ListeningArticleCard
      v-for="article in list.items.value"
      :key="article.id"
      :article="article" /><SceneListFooter
      :busy="list.moreBusy.value"
      :error="list.moreError.value"
      :has-more="list.hasMore.value"
      :done="list.done.value"
      @more="list.more"
  /></AppPage>
</template>
