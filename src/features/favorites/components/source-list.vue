<script setup lang="ts">
import type { FavoriteSourceViewModel } from '@/features/favorites/favorite-presenter'

defineProps<{ sources: FavoriteSourceViewModel[] }>()

const emit = defineEmits<{
  open: [route: string]
}>()

/** 只对仍有权限的来源发出返回原文导航。 */
function handleOpen(route: string | null) {
  if (route) emit('open', route)
}
</script>

<template>
  <view class="source-list">
    <button
      v-for="source in sources"
      :key="`${source.scene_id}:${source.source_locator}`"
      class="source-list__item"
      :disabled="!source.returnUrl"
      @click="handleOpen(source.returnUrl)"
    >
      <text class="source-list__sentence">{{ source.sentence_snapshot }}</text>
      <text class="source-list__status">
        {{ source.returnUrl ? '返回原文' : '当前无原文访问权限' }}
      </text>
    </button>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.source-list {
  display: grid;
  gap: 16rpx;

  &__item {
    width: 100%;
    margin: 0;
    padding: 28rpx;
    border: 2rpx solid tokens.$color-border;
    border-radius: tokens.$radius-medium;
    background: rgb(255 255 255 / 76%);
    color: tokens.$color-text;
    text-align: left;

    &[disabled] {
      opacity: 0.68;
    }
  }

  &__sentence,
  &__status {
    display: block;
  }

  &__sentence {
    font-family: Georgia, serif;
    font-size: 27rpx;
    line-height: 1.5;
  }

  &__status {
    margin-top: 12rpx;
    color: tokens.$color-primary;
    font-size: 21rpx;
  }
}
</style>
