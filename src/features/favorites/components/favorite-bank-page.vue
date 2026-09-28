<script setup lang="ts">
import { onLoad, onShow } from '@dcloudio/uni-app'

import AppState from '@/components/app-state/app-state.vue'
import FavoriteList from '@/features/favorites/components/favorite-list.vue'
import TabPageLayout from '@/layouts/tab-page-layout.vue'
import { getRuntimeServices } from '@/services/runtime'
import { navigate } from '@/shared/navigation/navigate'
import { useFavoriteStore } from '@/stores/favorites'

import type { FavoriteGroup } from '@/features/favorites/favorite-presenter'
import type { FavoriteType } from '@/shared/contracts/favorites'

const props = withDefaults(defineProps<{ initialTab?: FavoriteType }>(), {
  initialTab: 'VOCABULARY'
})
const favorites = useFavoriteStore()
const runtime = getRuntimeServices()

/** 接收成果页标签参数，并覆盖页面默认银行。 */
function handleLoad(query?: Record<string, string>) {
  const type = query?.tab === 'phrases' ? 'PHRASE' : props.initialTab
  favorites.selectTab(type)
}

/** 页面显示时刷新当前银行第一页。 */
function handleShow() {
  void favorites.load(runtime.favorites, true)
}

/** 切换银行后读取该标签自己的游标与筛选状态。 */
function selectTab(type: FavoriteType) {
  favorites.selectTab(type)
  void favorites.load(runtime.favorites, true)
}

/** 保存当前标签筛选条件。 */
function handleFilter(event: unknown) {
  const inputEvent = event as unknown as { detail: { value: string } }
  favorites.updateTabState(favorites.activeTab, { filter: inputEvent.detail.value })
}

/** 打开聚合组第一条收藏详情。 */
async function openGroup(group: FavoriteGroup) {
  const id = group.items[0]?.id
  if (id)
    await navigate({
      type: 'navigateTo',
      url: `/pages/favorites/detail?id=${encodeURIComponent(id)}`
    })
}

/** 使用当前可见收藏创建翻卡入口。 */
async function startReview() {
  const ids = favorites.visibleGroups
    .flatMap((group) => group.items.map((item) => item.id))
    .slice(0, 10)
  if (ids.length === 0) return
  await navigate({
    type: 'navigateTo',
    url: `/pages/favorites/review-front?cardIds=${encodeURIComponent(ids.join(','))}`
  })
}

onLoad(handleLoad)
onShow(handleShow)
</script>

<template>
  <TabPageLayout active="favorites">
    <view class="favorite-bank__heading">
      <text class="favorite-bank__eyebrow">收藏复习</text>
      <text class="favorite-bank__title">我的收藏</text>
    </view>
    <view class="favorite-bank__tabs">
      <button
        :class="{ 'favorite-bank__tab--active': favorites.activeTab === 'VOCABULARY' }"
        class="favorite-bank__tab"
        @click="selectTab('VOCABULARY')"
      >
        词汇银行
      </button>
      <button
        :class="{ 'favorite-bank__tab--active': favorites.activeTab === 'PHRASE' }"
        class="favorite-bank__tab"
        @click="selectTab('PHRASE')"
      >
        语块银行
      </button>
    </view>
    <input
      class="favorite-bank__filter"
      :value="favorites.tabState[favorites.activeTab].filter"
      placeholder="筛选收藏"
      @input="handleFilter"
    />
    <FavoriteList
      v-if="favorites.visibleGroups.length > 0"
      :groups="favorites.visibleGroups"
      @select="openGroup"
    />
    <AppState
      v-else
      description="在场景词汇或语块弹层中点击收藏后，会出现在这里。"
      icon-label="收藏为空"
      title="还没有收藏内容"
    />
    <button
      v-if="favorites.visibleGroups.length > 0"
      class="favorite-bank__review"
      @click="startReview"
    >
      开始翻卡复习
    </button>
  </TabPageLayout>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.favorite-bank {
  &__eyebrow,
  &__title {
    display: block;
  }

  &__eyebrow {
    color: tokens.$color-primary;
    font-size: 23rpx;
    font-weight: 700;
  }

  &__title {
    margin-top: 6rpx;
    font-family: Georgia, 'Noto Serif SC', serif;
    font-size: 48rpx;
    font-weight: 700;
  }

  &__tabs {
    display: grid;
    margin-top: 28rpx;
    padding: 8rpx;
    border-radius: tokens.$radius-medium;
    background: tokens.$color-module;
    grid-template-columns: repeat(2, 1fr);
  }

  &__tab {
    margin: 0;
    border: 0;
    border-radius: 18rpx;
    background: transparent;
    color: tokens.$color-text-muted;
    font-size: 26rpx;

    &--active {
      background: tokens.$color-white;
      color: tokens.$color-primary-strong;
      font-weight: 700;
      box-shadow: tokens.$shadow-card;
    }
  }

  &__filter {
    height: 80rpx;
    margin-top: 20rpx;
    padding: 0 24rpx;
    border: 2rpx solid tokens.$color-border;
    border-radius: tokens.$radius-medium;
    background: rgb(255 255 255 / 72%);
    font-size: 25rpx;
  }

  &__review {
    width: 100%;
    min-height: 88rpx;
    margin-top: 28rpx;
    border-radius: tokens.$radius-medium;
    background: tokens.$color-primary;
    color: tokens.$color-white;
    font-size: 29rpx;
    font-weight: 700;
  }
}
</style>
