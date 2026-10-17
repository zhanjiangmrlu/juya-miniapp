<script setup lang="ts">
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
  <view class="vocabulary-section"
    ><text class="section-title">重点词汇 <text class="section-note">本句释义</text></text>
    <view v-for="word in vocabulary" :key="word.id" class="word">
      <button
        class="word-trigger"
        :aria-label="`试听 ${word.english}`"
        :disabled="
          disabled || (state.wordId === word.id && state.wordStatus === AudioStatus.LOADING)
        "
        @click="word.id && emit('play', word.id)"
      >
        <text>{{ word.english }}</text
        ><text class="voice-label">{{
          state.wordId === word.id && state.wordStatus === AudioStatus.LOADING
            ? '加载中…'
            : state.wordId === word.id && state.wordStatus === AudioStatus.PLAYING
              ? '播放中'
              : '试听'
        }}</text>
      </button>
      <text v-if="word.phonetic" class="phonetic">{{ word.phonetic }}</text
      ><text class="meaning">{{ word.meaning }}</text>
      <text v-if="word.source" class="source">{{ sourceLine(word.source.line_id) }}</text>
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
  margin-top: 52rpx;

  .section-note {
    font-size: 22rpx;
    color: #637268;
    font-weight: 400;
  }

  .word {
    padding: 26rpx 0;
    border-bottom: 1px solid #e5e9de;
  }

  .word-trigger {
    padding: 0;
    border: 0;
    background: none;
    justify-content: flex-start;
    gap: 24rpx;
    text-align: left;
    color: #254733;
    font-size: 34rpx;
    font-weight: 600;
    line-height: 1.6;
  }

  .voice-label {
    color: #347553;
    font-size: 22rpx;
    font-weight: 400;
  }

  .phonetic {
    display: block;
    color: #637268;
    font-size: 24rpx;
    margin-top: 4rpx;
  }

  .meaning {
    display: block;
    font-size: 28rpx;
    margin-top: 10rpx;
    line-height: 1.8;
  }

  .source {
    display: block;
    font-size: 24rpx;
    color: #637268;
    line-height: 1.8;
    margin-top: 16rpx;
    white-space: pre-wrap;
  }

  .voice-error {
    font-size: 22rpx;
    color: #a23f35;
    justify-content: flex-start;
  }
}
</style>
