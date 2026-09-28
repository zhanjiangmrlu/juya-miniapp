<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'

import AppPage from '@/components/app-page/app-page.vue'
import AppState from '@/components/app-state/app-state.vue'
import PageHeader from '@/components/page-header/page-header.vue'
import { getRuntimeServices } from '@/services/runtime'

interface HistoryItem {
  completed_at: string | null
  last_learned_at: string
  scene_id: string
}

const items = ref<HistoryItem[]>([])

/** 读取服务端学习历史；开放场景复习入口也复用该列表。 */
async function loadHistory() {
  try {
    const response = await getRuntimeServices().client.get<{ items: HistoryItem[] }>(
      '/api/v1/history/scenes'
    )
    items.value = response.items
  } catch {
    items.value = []
  }
}

onShow(loadHistory)
</script>

<template>
  <AppPage>
    <PageHeader eyebrow="学习记录" title="学习过的场景" />
    <view v-if="items.length > 0" class="history-page">
      <view v-for="item in items" :key="item.scene_id" class="history-page__item">
        <text class="history-page__scene">{{ item.scene_id }}</text>
        <text class="history-page__status">{{ item.completed_at ? '已完成' : '学习中' }}</text>
      </view>
    </view>
    <AppState
      v-else
      description="完成或开始学习场景后，会在这里保留历史记录。"
      icon-label="暂无历史"
      title="还没有学习记录"
    />
  </AppPage>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.history-page {
  display: grid;
  gap: 16rpx;

  &__item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 28rpx;
    border: 2rpx solid tokens.$color-border;
    border-radius: tokens.$radius-medium;
    background: rgb(255 255 255 / 72%);
  }

  &__scene {
    font-size: 27rpx;
    font-weight: 700;
  }

  &__status {
    color: tokens.$color-primary;
    font-size: 22rpx;
  }
}
</style>
