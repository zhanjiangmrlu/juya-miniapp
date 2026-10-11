<script setup lang="ts">
import PronunciationButton from '@/features/audio/components/pronunciation-button.vue'
import { getFavoriteMissingMessage } from '@/features/favorites/favorite-missing-message'
import { getFavoritePronunciation } from '@/features/favorites/favorite-pronunciation'
import { FavoriteType } from '@/shared/enums/favorites'
import { useFavoriteStore } from '@/stores/favorites'

import type { FavoriteListEmits, FavoriteListProps } from '@/shared/types/favorites-components'
defineProps<FavoriteListProps>()
const emit = defineEmits<FavoriteListEmits>()
const favorites = useFavoriteStore()
</script>
<template>
  <view class="favorite-list">
    <view
      v-for="group in groups"
      :key="group.id"
      class="favorite-entry"
      @click="emit('select', group)"
    >
      <view class="entry-content">
        <view class="entry-heading">
          <text class="entry-word">{{
            group.items[0]?.english || group.displayKey || '英文待补齐'
          }}</text>
          <PronunciationButton
            v-if="group.items[0] && getFavoritePronunciation(group.items[0])"
            class="entry-audio"
            :target="getFavoritePronunciation(group.items[0])"
            :context="{ favorite_id: group.id }"
            @click.stop
          />
        </view>
        <text class="entry-meaning">{{
          [
            group.items[0]?.chinese,
            group.items[0]?.entry_type === FavoriteType.VOCABULARY
              ? group.sources[0]?.scene_title
              : null
          ]
            .filter(Boolean)
            .join(' · ')
        }}</text>
        <text
          v-if="group.items[0] && getFavoriteMissingMessage(group.items[0])"
          class="entry-missing"
          >{{ getFavoriteMissingMessage(group.items[0]) }}</text
        >
      </view>
      <button
        class="favorite-state"
        :disabled="favorites.isPending(group.id)"
        :aria-busy="favorites.isPending(group.id)"
        @click.stop="emit('remove', group.id)"
      >
        已收藏<text v-if="favorites.isPending(group.id)" class="pending-dot">·</text>
      </button>
    </view>
  </view>
</template>
<style scoped lang="scss">
.favorite-list {
  display: grid;
  gap: 8px;

  .favorite-entry {
    display: flex;
    min-height: 80px;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    padding: 10px 14px;
    border: 1px solid #d6dfc9;
    border-radius: 12px;
    background: #fffdf7;
  }

  .entry-content {
    min-width: 0;
    flex: 1;
  }

  .entry-heading {
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }

  .entry-word {
    padding: 0;
    color: #254733;
    font-size: 14px;
    font-weight: 700;
    line-height: 22px;
    overflow-wrap: anywhere;
  }

  .entry-audio {
    flex: 0 0 44px;
    margin: -11px -12px;
  }

  .entry-meaning {
    display: block;
    margin-top: 4px;
    color: #6b7d6a;
    font-size: 11px;
    line-height: 18px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .entry-missing {
    display: block;
    color: #80664c;
    font-size: 11px;
    line-height: 18px;
    overflow-wrap: anywhere;
  }

  .favorite-state {
    min-width: 60px;
    min-height: 44px;
    flex-shrink: 0;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: #4e7f3b;
    font-size: 10px;
    line-height: 44px;
    text-align: right;

    &::after {
      border: 0;
    }

    &[disabled] {
      opacity: 0.6;
    }
  }
}
</style>
