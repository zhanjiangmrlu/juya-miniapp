<script setup lang="ts">
import SceneChunkList from '@/features/scene/components/scene-chunk-list.vue'
import SceneWordGrid from '@/features/scene/components/scene-word-grid.vue'

import type { SceneReadingViewEmits, SceneReadingViewProps } from '@/shared/types/scene-components'
withDefaults(defineProps<SceneReadingViewProps>(), { pendingIds: () => [], highlightedId: '' })
const emit = defineEmits<SceneReadingViewEmits>()
</script>
<template>
  <view class="scene-reading-view">
    <view v-if="entries.length" class="section-heading"
      ><text>场景对话</text
      ><text class="section-meta">共 {{ entries.length }} 句 · 完整对话</text></view
    >
    <view v-if="entries.length" class="dialogue-card">
      <view
        v-for="entry in entries"
        :id="'sentence-' + entry.entry_id"
        :key="entry.entry_id"
        class="sentence-row"
        :class="{ highlighted: highlightedId === entry.entry_id }"
        :role="entry.audio_timing ? 'button' : undefined"
        :tabindex="entry.audio_timing ? 0 : undefined"
        @click="emit('playSentence', entry)"
        @keydown.enter="emit('playSentence', entry)"
      >
        <text v-if="entry.speaker" class="sentence-speaker">{{ entry.speaker }}:</text
        ><text class="sentence-text">{{ entry.text }}</text>
      </view>
      <button
        class="translation-toggle"
        :aria-expanded="chineseVisible"
        @click="emit('toggleTranslation')"
      >
        {{ chineseVisible ? '收起译文' : '查看译文' }}
      </button>
      <view v-if="chineseVisible" class="full-translation">
        <view v-for="entry in entries" :key="entry.entry_id" class="translation-row"
          ><text v-if="entry.speaker" class="sentence-speaker">{{ entry.speaker }}：</text
          ><text>{{ entry.chinese }}</text></view
        >
      </view>
    </view>
    <template v-if="words.length"
      ><view class="section-heading">重点词汇</view
      ><SceneWordGrid
        :entries="words"
        :content-version="contentVersion"
        :pending-ids="pendingIds"
        @favorite="emit('favorite', $event)"
    /></template>
    <template v-if="chunks.length"
      ><view class="section-heading">语块</view
      ><SceneChunkList
        :entries="chunks"
        :content-version="contentVersion"
        :pending-ids="pendingIds"
        @favorite="emit('favorite', $event)"
    /></template>
  </view>
</template>
<style scoped lang="scss">
.scene-reading-view {
  .section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 20px 0 14px;
    color: #254733;
    font-size: 20px;
    font-weight: 700;
    line-height: 28px;
  }

  .section-meta {
    color: #748271;
    font-size: 12px;
    font-weight: 400;
  }

  .dialogue-card {
    padding: 16px;
    border: 1px solid #d9e4d2;
    border-radius: 12px;
    background: #fffdf7;
  }

  .sentence-row {
    margin: 0 0 6px;
    color: #254733;
    font-size: 13px;
    line-height: 26px;
    overflow-wrap: anywhere;

    &.highlighted {
      border-radius: 6px;
      background: #e2eed9;
    }
  }

  .sentence-speaker {
    margin-right: 3px;
    color: #96523a;
    font-weight: 700;
  }

  .translation-toggle {
    width: 100%;
    min-height: 44px;
    margin: 12px 0 0;
    padding: 10px;
    border-radius: 12px;
    background: #e2eed9;
    color: #254733;
    font-size: 14px;
    line-height: 24px;

    &::after {
      border: 0;
    }
  }

  .full-translation {
    margin-top: 14px;

    .translation-row {
      margin-bottom: 6px;
      color: #254733;
      font-size: 14px;
      line-height: 22px;
      overflow-wrap: anywhere;
    }
  }
}
</style>
