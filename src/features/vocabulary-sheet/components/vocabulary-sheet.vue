<script setup lang="ts">
import AudioButton from '@/features/audio/components/audio-button.vue'

import type { AudioStatus } from '@/features/audio/audio-machine'
import type { AudioTarget, SceneEntry } from '@/shared/contracts/learning'

defineProps<{
  currentAudioKey?: string | null
  entry: SceneEntry
  status: AudioStatus
}>()

const emit = defineEmits<{
  close: []
  favorite: [entry: SceneEntry]
  play: [target: AudioTarget]
}>()

/** 关闭弹层并由页面恢复稳定阅读位置。 */
function handleClose() {
  emit('close')
}

/** 收藏当前词汇或语块，成功后保持弹层打开。 */
function handleFavorite(entry: SceneEntry) {
  emit('favorite', entry)
}

/** 播放当前词汇或语块音频。 */
function handlePlay(target: AudioTarget) {
  emit('play', target)
}
</script>

<template>
  <view class="vocabulary-sheet" role="dialog" aria-modal="true" aria-label="词汇详情">
    <view class="vocabulary-sheet__panel">
      <view class="vocabulary-sheet__handle" />
      <view class="vocabulary-sheet__topline">
        <text class="vocabulary-sheet__badge">
          {{ entry.entry_type === 'PHRASE' ? 'Useful Chunk' : '重点词汇' }}
        </text>
        <button class="vocabulary-sheet__close" aria-label="关闭" @click="handleClose">×</button>
      </view>
      <view class="vocabulary-sheet__word-row">
        <text class="vocabulary-sheet__word">{{ entry.text }}</text>
        <AudioButton
          v-if="entry.audio"
          :current-key="currentAudioKey"
          :status="status"
          :target="entry.audio"
          @play="handlePlay"
        />
      </view>
      <text v-if="entry.phonetic" class="vocabulary-sheet__phonetic">{{ entry.phonetic }}</text>
      <text v-if="entry.chinese" class="vocabulary-sheet__chinese">{{ entry.chinese }}</text>
      <text v-if="entry.explanation" class="vocabulary-sheet__explanation">
        {{ entry.explanation }}
      </text>
      <view class="vocabulary-sheet__actions">
        <button class="vocabulary-sheet__favorite" @click="handleFavorite(entry)">收藏</button>
        <button class="vocabulary-sheet__return" @click="handleClose">返回原文</button>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.vocabulary-sheet {
  position: fixed;
  z-index: 65;
  display: flex;
  align-items: flex-end;
  background: rgb(34 55 46 / 46%);
  inset: 0;

  &__panel {
    width: 100%;
    padding: 16rpx 40rpx calc(40rpx + env(safe-area-inset-bottom));
    border-radius: 48rpx 48rpx 0 0;
    background: #fff8e9;
  }

  &__handle {
    width: 80rpx;
    height: 8rpx;
    margin: 0 auto 30rpx;
    border-radius: tokens.$radius-pill;
    background: #d8d4c8;
  }

  &__topline,
  &__word-row,
  &__actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__badge {
    padding: 8rpx 16rpx;
    border-radius: tokens.$radius-pill;
    background: #dff1e7;
    color: tokens.$color-primary-strong;
    font-size: 21rpx;
  }

  &__close {
    width: 64rpx;
    height: 64rpx;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: rgb(255 255 255 / 76%);
    color: tokens.$color-text;
    font-size: 40rpx;
  }

  &__word-row {
    justify-content: flex-start;
    margin-top: 12rpx;
    gap: 24rpx;
  }

  &__word {
    font-family: Georgia, serif;
    font-size: 52rpx;
    font-weight: 700;
  }

  &__phonetic,
  &__chinese,
  &__explanation {
    display: block;
    margin-top: 18rpx;
  }

  &__phonetic {
    color: tokens.$color-text-muted;
    font-size: 26rpx;
  }

  &__chinese {
    font-size: 32rpx;
    font-weight: 700;
  }

  &__explanation {
    font-size: 27rpx;
    line-height: 1.65;
  }

  &__actions {
    margin-top: 32rpx;
    gap: 16rpx;
  }

  &__favorite,
  &__return {
    width: 50%;
    min-height: 88rpx;
    margin: 0;
    border-radius: tokens.$radius-medium;
    font-size: 28rpx;
    font-weight: 700;
  }

  &__favorite {
    border: 2rpx solid tokens.$color-border;
    background: tokens.$color-white;
    color: tokens.$color-primary-strong;
  }

  &__return {
    background: tokens.$color-primary;
    color: tokens.$color-white;
  }
}
</style>
