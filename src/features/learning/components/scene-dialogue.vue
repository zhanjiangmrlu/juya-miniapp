<script setup lang="ts">
import { ref } from 'vue'

import SceneSectionHeading from '@/features/learning/components/scene-section-heading.vue'
import { highlightSegments } from '@/features/learning/scene-model'
import { SCENE_HIGHLIGHT_COLORS } from '@/shared/constants/learning'

import type { SceneDialogueProps } from '@/shared/types/learning-components'
const props = defineProps<SceneDialogueProps>()
const translated = ref(false)
/** 为词汇在对话中的高亮复用稳定的原型配色
 * @param quote 当前已确认来源的英文片段
 */
const highlightColor = (quote: string) => {
  const index = props.vocabulary.findIndex((word) => word.source?.quote === quote)
  return SCENE_HIGHLIGHT_COLORS[Math.max(0, index) % SCENE_HIGHLIGHT_COLORS.length]
}
</script>
<template>
  <view class="dialogue-section">
    <SceneSectionHeading english="The conversation" chinese="场景对话" />
    <view
      v-for="(line, lineIndex) in dialogue"
      :key="line.id"
      class="dialogue"
      :class="{ 'long-speaker': line.speaker.length > 2, alternate: lineIndex % 2 === 1 }"
    >
      <text class="speaker">{{ line.speaker }}</text>
      <view class="english"
        ><text
          v-for="(part, index) in highlightSegments(line, vocabulary)"
          :key="index"
          :class="{ highlight: part.highlight }"
          :style="part.highlight ? { backgroundColor: highlightColor(part.text) } : undefined"
          >{{ part.text }}</text
        ></view
      >
    </view>
    <button
      class="translation-toggle"
      :aria-expanded="translated"
      @click="translated = !translated"
    >
      {{ translated ? '收起译文' : '显示译文'
      }}<image
        :src="translated ? '/static/design/translate-up.svg' : '/static/design/translate-down.svg'"
        mode="aspectFit"
        aria-hidden="true"
      />
    </button>
    <view v-if="translated" class="translation-section">
      <view v-for="line in dialogue" :key="line.id" class="translation-line"
        ><text class="translation-speaker">{{ line.speaker }}：</text
        ><text class="translation">{{ line.chinese }}</text></view
      >
    </view>
  </view>
</template>
<style scoped lang="scss">
.dialogue-section {
  .dialogue {
    position: relative;
    padding-left: 61.538rpx;
    margin-bottom: 34.615rpx;
  }

  .speaker {
    position: absolute;
    left: 0;
    top: 3.846rpx;
    width: 42.308rpx;
    height: 42.308rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #e4f0db;
    font-size: 19.231rpx;
    font-weight: 500;
    line-height: 1;
    color: #47674c;
  }

  .alternate .speaker {
    background: #fbe4cd;
    color: #ad4f32;
  }

  .long-speaker {
    padding-left: 0;

    .speaker {
      position: static;
      display: table;
      width: auto;
      height: auto;
      padding: 7.692rpx 15.385rpx;
      margin-bottom: 11.538rpx;
      border-radius: 7.692rpx;
      line-height: 1.5;
    }
  }

  .english {
    font-size: 32.692rpx;
    line-height: 53.846rpx;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .highlight {
    background: #ddefd8;
    color: #2b4438;
    padding: 1.923rpx 5.769rpx;
    border-radius: 5.769rpx;
    font-weight: 700;
    box-decoration-break: clone;
  }

  .translation-toggle {
    display: inline-flex;
    font-size: 23.077rpx;
    font-weight: 500;
    border: 1px solid #dfe5d8;
    border-radius: 15.385rpx;
    padding: 15.385rpx 23.077rpx;
    margin: 5.769rpx 0 0;
    min-height: 69.231rpx;
    background: #fff;
  }

  .translation-toggle image {
    width: 28.846rpx;
    height: 28.846rpx;
    margin-left: 11.538rpx;
  }

  .translation-section {
    margin-top: 26.923rpx;
    padding: 32.692rpx 28.846rpx 13.462rpx;
    background: #fff;
    border: 1px solid #dfe5d8;
    border-radius: 19.231rpx;
  }

  .translation-line {
    font-size: 25rpx;
    line-height: 1.9;
    color: #586c5b;
    margin-bottom: 23.077rpx;
  }

  .translation-speaker {
    color: #ad4f32;
    font-weight: 500;
  }

  .translation {
    white-space: pre-wrap;
  }
}
</style>
