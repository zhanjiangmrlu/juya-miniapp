<script setup lang="ts">
import { AudioStatus } from '@/shared/enums/audio'

import type { ListeningVocabularyProps } from '@/shared/types/listening-components'
const props = defineProps<ListeningVocabularyProps>()
defineEmits<{ play: [wordId: string] }>()
/** 将服务端原文偏移转为用户可见段号，不重建词汇来源
 * @param start 当前词条原句在正文中的code point起点
 */
const paragraph = (start: number) =>
  Array.from(props.body)
    .slice(0, start)
    .join('')
    .split(/\r\n|\r|\n/).length
</script>
<template>
  <view v-if="words.length" class="vocabulary">
    <text class="vocabulary-title">重点词汇</text>
    <text class="vocabulary-note">听一听单词，再回到原句。</text>
    <view v-for="word in words" :key="word.id" class="vocabulary-row">
      <view class="word-heading"
        ><text class="word-english">{{ word.english }}</text
        ><text v-if="word.phonetic" class="word-phonetic">{{ word.phonetic }}</text
        ><button
          class="word-speaker"
          :aria-label="'播放单词 ' + word.english"
          @click="$emit('play', word.id)"
        >
          <image src="/static/listening/r17-vocabulary-speaker.svg" mode="aspectFit" /></button
      ></view>
      <text v-if="word.meaning" class="word-meaning">{{ word.meaning }}</text>
      <template v-if="word.source"
        ><text class="word-sentence">{{ word.source.quote }}</text
        ><text class="word-source"
          >正文原句 · 第{{ paragraph(word.source.start) }}段</text
        ></template
      >
      <view v-if="audio.wordId === 'vocabulary:' + word.id" class="word-status" role="status"
        ><text v-if="audio.wordStatus === AudioStatus.LOADING">正在准备发音…</text
        ><text v-else-if="audio.wordStatus === AudioStatus.PLAYING">正在播放单词 · 全文已暂停</text
        ><button v-else-if="audio.wordError" class="word-retry" @click="$emit('play', word.id)">
          {{ audio.wordError }}
        </button></view
      >
    </view>
  </view>
</template>
<style scoped lang="scss">
.vocabulary {
  margin-top: 48rpx;

  .vocabulary-title,
  .vocabulary-note,
  .word-meaning,
  .word-sentence,
  .word-source {
    display: block;
  }

  .vocabulary-title {
    font-size: 36.538rpx;
    font-weight: 700;
    line-height: 1.5;
  }

  .vocabulary-note {
    margin-top: 15.385rpx;
    font-size: 26.923rpx;
    line-height: 1.9;
    color: #586c5b;
  }

  .vocabulary-row {
    padding: 38.462rpx 0;
    border-bottom: 1px solid #dfe5d8;
  }

  .word-heading {
    display: flex;
    align-items: center;
    gap: 19.231rpx;
    min-height: 44px;
  }

  .word-english,
  .word-phonetic {
    font-family: var(--app-latin-font, 'DM Sans', sans-serif);
    font-size: 20px;
    line-height: 30px;
    overflow-wrap: anywhere;
  }

  .word-english {
    font-weight: 500;
  }

  .word-phonetic {
    color: #586c5b;
  }

  .word-speaker {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    min-height: 44px;
    margin: 0 0 0 auto;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: #e4f0db;

    image {
      width: 20px;
      height: 20px;
    }
  }

  .word-meaning {
    margin-top: 11.538rpx;
    font-size: 16px;
    line-height: 28px;
  }

  .word-sentence {
    margin-top: 15.385rpx;
    font-family: var(--app-latin-font, 'DM Sans', sans-serif);
    font-size: 16px;
    line-height: 1.8;
  }

  .word-source {
    margin-top: 13.462rpx;
    font-size: 21.154rpx;
    line-height: 1.8;
    color: #586c5b;
  }

  .word-status {
    margin-top: 12rpx;
    font-size: 23rpx;
    color: #586c5b;
  }

  .word-retry {
    min-height: 44px;
    margin: 0;
    padding: 0;
    background: transparent;
    border: 0;
    color: #97442d;
    text-align: left;
    font-size: 25rpx;
  }
}
</style>
