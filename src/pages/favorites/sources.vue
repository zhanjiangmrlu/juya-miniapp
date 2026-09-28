<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'

import AppPage from '@/components/app-page/app-page.vue'
import PageHeader from '@/components/page-header/page-header.vue'
import SourceList from '@/features/favorites/components/source-list.vue'
import {
  type FavoriteSourceViewModel,
  presentFavorites
} from '@/features/favorites/favorite-presenter'
import { getRuntimeServices } from '@/services/runtime'
import { navigate } from '@/shared/navigation/navigate'

const sources = ref<FavoriteSourceViewModel[]>([])

/** 加载收藏的全部来源，并保留无权限来源的只读快照。 */
async function handleLoad(query?: Record<string, string>) {
  if (!query?.id) return
  const item = await getRuntimeServices().favorites.get(query.id)
  sources.value = presentFavorites([item])[0]?.sources ?? []
}

/** 打开仍有访问权限的原文定位页。 */
async function openSource(route: string) {
  await navigate({ type: 'navigateTo', url: route })
}

onLoad(handleLoad)
</script>

<template>
  <AppPage>
    <PageHeader eyebrow="多来源保留" title="收藏来源" />
    <SourceList :sources="sources" @open="openSource" />
  </AppPage>
</template>
