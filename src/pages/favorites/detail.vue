<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

import AppButton from '@/components/app-button/app-button.vue'
import AppPage from '@/components/app-page/app-page.vue'
import AppState from '@/components/app-state/app-state.vue'
import PageHeader from '@/components/page-header/page-header.vue'
import SourceList from '@/features/favorites/components/source-list.vue'
import { presentFavorites } from '@/features/favorites/favorite-presenter'
import { getRuntimeServices } from '@/services/runtime'
import { navigate } from '@/shared/navigation/navigate'

import type { FavoriteItem } from '@/shared/contracts/favorites'

const item = ref<FavoriteItem>()
const group = computed(() => (item.value ? presentFavorites([item.value])[0] : undefined))

/** 按收藏标识读取服务端详情与全部来源。 */
async function handleLoad(query?: Record<string, string>) {
  if (query?.id) item.value = await getRuntimeServices().favorites.get(query.id)
}

/** 打开完整来源选择页。 */
async function openSources() {
  if (!item.value) return
  await navigate({
    type: 'navigateTo',
    url: `/pages/favorites/sources?id=${encodeURIComponent(item.value.id)}`
  })
}

/** 删除收藏后返回对应银行。 */
async function removeFavorite() {
  if (!item.value) return
  await getRuntimeServices().favorites.remove(item.value.id)
  uni.navigateBack()
}

onLoad(handleLoad)
</script>

<template>
  <AppPage>
    <PageHeader eyebrow="收藏详情" :title="group?.displayKey ?? '收藏条目'" />
    <view v-if="group" class="favorite-detail__card">
      <text class="favorite-detail__word">{{ group.displayKey }}</text>
      <text class="favorite-detail__type">
        {{ group.items[0]?.entry_type === 'PHRASE' ? '语块银行' : '词汇银行' }}
      </text>
    </view>
    <SourceList v-if="group" :sources="group.sources.slice(0, 1)" />
    <AppState
      v-else
      description="该收藏可能已被删除，请返回列表刷新。"
      icon-label="收藏不存在"
      title="未找到收藏"
    />
    <view v-if="group" class="favorite-detail__actions">
      <AppButton label="查看全部来源" @press="openSources" />
      <AppButton label="取消收藏" variant="quiet" @press="removeFavorite" />
    </view>
  </AppPage>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.favorite-detail {
  &__card {
    margin-bottom: 24rpx;
    padding: 48rpx;
    border: 2rpx solid tokens.$color-border;
    border-radius: tokens.$radius-large;
    background: tokens.$color-module;
    text-align: center;
  }

  &__word,
  &__type {
    display: block;
  }

  &__word {
    font-family: Georgia, serif;
    font-size: 54rpx;
    font-weight: 700;
  }

  &__type {
    margin-top: 18rpx;
    color: tokens.$color-text-muted;
    font-size: 24rpx;
  }

  &__actions {
    display: grid;
    margin-top: 28rpx;
    gap: 8rpx;
  }
}
</style>
