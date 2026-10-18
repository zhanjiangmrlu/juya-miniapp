<script setup lang="ts">
import SceneSectionHeading from '@/features/learning/components/scene-section-heading.vue'
import { AudioStatus } from '@/shared/enums/audio'

import type { SceneVocabularyProps } from '@/shared/types/learning-components'
const props = defineProps<SceneVocabularyProps>()
const emit = defineEmits<{ play: [id: string] }>()
/** 展示已经确认的完整适用原句
 * @param lineId 本词汇绑定的对话引用
 */
const sourceLine = (lineId?: string) =>
  props.dialogue.find((line) => line.id === lineId)?.english || ''
</script>
<template>
  <view class="vocabulary-section">
    <SceneSectionHeading english="Words to keep" chinese="重点词汇" :count="vocabulary.length" />
    <text class="vocabulary-help">点击英文或喇叭听发音 · 中文为本句释义</text>
    <view v-for="word in vocabulary" :key="word.id" class="word">
      <view class="word-top">
        <button
          class="word-trigger"
          :aria-label="`试听 ${word.english}`"
          :disabled="
            disabled || (state.wordId === word.id && state.wordStatus === AudioStatus.LOADING)
          "
          @click="word.id && emit('play', word.id)"
        >
          <text class="word-english">{{ word.english }}</text>
          <text v-if="word.phonetic" class="phonetic">{{ word.phonetic }}</text>
        </button>
        <button
          class="voice-button"
          :aria-label="`播放${word.english}的发音`"
          :disabled="
            disabled || (state.wordId === word.id && state.wordStatus === AudioStatus.LOADING)
          "
          @click="word.id && emit('play', word.id)"
        >
          <text v-if="state.wordId === word.id && state.wordStatus === AudioStatus.LOADING">…</text
          ><image v-else src="/static/design/speaker.svg" mode="aspectFit" aria-hidden="true" />
        </button>
      </view>
      <text v-if="word.meaning" class="meaning">{{ word.meaning }}</text>
      <text v-if="word.source" class="source">原句 · {{ sourceLine(word.source.line_id) }}</text>
      <text
        v-if="state.wordId === word.id && state.wordStatus === AudioStatus.PLAYING"
        class="voice-status"
        >播放中</text
      >
      <button
        v-if="state.wordId === word.id && state.wordError"
        class="text-button voice-error"
        @click="word.id && emit('play', word.id)"
      >
        {{ state.wordError }}
      </button>
    </view>
  </view>
</template>
<style scoped lang="scss">
.vocabulary-section {
  margin-top: 57.692rpx;
  border-top: 1px solid #dfe5d8;
  padding-top: 51.923rpx;

  .vocabulary-help {
    display: block;
    font-size: 21.154rpx;
    line-height: 1.8;
    color: #586c5b;
    margin: 13.462rpx 0;
  }

  .word {
    padding: 30.769rpx 0;
    border-bottom: 1px solid #dfe5d8;
  }

  .word-top {
    display: flex;
    align-items: flex-start;
    gap: 23.077rpx;
  }

  .word-trigger {
    display: block;
    flex: 1;
    min-width: 0;
    padding: 9.615rpx 0;
    border: 0;
    border-radius: 0;
    background: none;
    justify-content: flex-start;
    text-align: left;
    color: #2b4438;
    font-family: 'DM Sans', sans-serif;
    font-size: 38.462rpx;
    font-weight: 500;
    line-height: 1.5;
    min-height: 84.615rpx;
    overflow-wrap: anywhere;
  }

  .voice-button {
    color: #586c5b;
    background: #fff;
    border: 0;
    border-radius: 50%;
    width: 84.615rpx;
    height: 84.615rpx;
    flex-shrink: 0;
    padding: 0;
  }

  .voice-button image {
    width: 28.846rpx;
    height: 28.846rpx;
  }

  .phonetic {
    display: inline;
    color: #586c5b;
    font-size: 38.462rpx;
    font-weight: 400;
    line-height: 1.5;
    margin-left: 15.385rpx;
  }

  .meaning {
    display: block;
    font-size: 30.769rpx;
    margin-top: 11.538rpx;
    overflow-wrap: anywhere;
    line-height: 1.8;
    color: #ad4f32;
  }

  .source {
    display: block;
    font-size: 30.769rpx;
    color: #586c5b;
    line-height: 1.8;
    margin-top: 13.462rpx;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .voice-status {
    color: #586c5b;
    font-size: 21.154rpx;
  }

  .voice-error {
    font-size: 23.077rpx;
    color: #97442d;
    justify-content: flex-start;
  }
}
</style>
