<script setup lang="ts">
import { ref } from 'vue'

import { highlightSegments } from '@/features/learning/scene-model'

import type { SceneDialogueProps } from '@/shared/types/learning-components'
defineProps<SceneDialogueProps>()
const translated = ref(false)
</script>
<template>
  <view class="dialogue-section">
    <text class="section-title">场景对话</text>
    <view v-for="line in dialogue" :key="line.id" class="dialogue">
      <text class="speaker">{{ line.speaker }}</text>
      <view class="english"
        ><text
          v-for="(part, index) in highlightSegments(line, vocabulary)"
          :key="index"
          :class="{ highlight: part.highlight }"
          >{{ part.text }}</text
        ></view
      >
    </view>
    <button class="text-button translation-toggle" @click="translated = !translated">
      {{ translated ? '收起译文' : '显示译文' }}
    </button>
    <view v-if="translated" class="translation-section">
      <text class="translation-title">完整译文</text>
      <view v-for="line in dialogue" :key="line.id" class="translation-line"
        ><text class="speaker">{{ line.speaker }}</text
        ><text class="translation">{{ line.chinese }}</text></view
      >
    </view>
  </view>
</template>
<style scoped lang="scss">
.dialogue-section {
  margin-top: 52rpx;

  .dialogue {
    margin-bottom: 32rpx;
  }

  .speaker {
    color: #637268;
    font-size: 22rpx;
    display: block;
    margin-bottom: 8rpx;
  }

  .english {
    font-size: 32rpx;
    line-height: 1.9;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .highlight {
    background: #e3edda;
    color: #347553;
    border-radius: 6rpx;
  }

  .translation-toggle {
    justify-content: flex-start;
  }

  .translation-section {
    margin-top: 20rpx;
    padding: 28rpx;
    background: #f2f4ed;
    border-radius: 16rpx;
  }

  .translation-title {
    display: block;
    font-size: 26rpx;
    font-weight: 600;
    margin-bottom: 24rpx;
  }

  .translation-line + .translation-line {
    margin-top: 24rpx;
  }

  .translation {
    display: block;
    color: #637268;
    font-size: 26rpx;
    line-height: 1.9;
    white-space: pre-wrap;
  }
}
</style>
