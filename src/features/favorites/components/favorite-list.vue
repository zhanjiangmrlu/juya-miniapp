<script setup lang="ts">
import type { FavoriteGroup } from '@/features/favorites/favorite-presenter'

defineProps<{ groups: FavoriteGroup[] }>()

const emit = defineEmits<{
  select: [group: FavoriteGroup]
}>()

/** 打开收藏聚合条目的详情。 */
function handleSelect(group: FavoriteGroup) {
  emit('select', group)
}
</script>

<template>
  <view class="favorite-list">
    <button
      v-for="group in groups"
      :key="group.displayKey"
      class="favorite-list__item"
      @click="handleSelect(group)"
    >
      <view>
        <text class="favorite-list__word">{{ group.displayKey }}</text>
        <text class="favorite-list__meta">
          {{ group.sources.length }} 个来源 ·
          {{ group.items[0]?.entry_type === 'PHRASE' ? '语块' : '词汇' }}
        </text>
      </view>
      <text class="favorite-list__action">查看</text>
    </button>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.favorite-list {
  display: grid;
  margin-top: 24rpx;
  gap: 16rpx;

  &__item {
    display: flex;
    width: 100%;
    min-height: 116rpx;
    align-items: center;
    justify-content: space-between;
    margin: 0;
    padding: 24rpx 28rpx;
    border: 2rpx solid tokens.$color-border;
    border-radius: tokens.$radius-medium;
    background: rgb(255 255 255 / 76%);
    color: tokens.$color-text;
    text-align: left;
  }

  &__word,
  &__meta {
    display: block;
  }

  &__word {
    font-family: Georgia, serif;
    font-size: 34rpx;
    font-weight: 700;
  }

  &__meta {
    margin-top: 8rpx;
    color: tokens.$color-text-muted;
    font-size: 22rpx;
  }

  &__action {
    color: tokens.$color-primary;
    font-size: 23rpx;
    font-weight: 700;
  }
}
</style>
