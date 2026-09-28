<script setup lang="ts">
import AudioButton from '@/features/audio/components/audio-button.vue'

import type { AudioStatus } from '@/features/audio/audio-machine'
import type { AudioTarget, SceneEntry } from '@/shared/contracts/learning'

defineProps<{
  currentAudioKey?: string | null
  entries: SceneEntry[]
  status: AudioStatus
}>()

const emit = defineEmits<{
  inspect: [entry: SceneEntry]
  play: [target: AudioTarget]
}>()

/** 打开当前词汇或语块的统一详情弹层。 */
function handleInspect(entry: SceneEntry) {
  emit('inspect', entry)
}

/** 播放条目音频。 */
function handlePlay(target: AudioTarget) {
  emit('play', target)
}
</script>

<template>
  <view class="entry-list">
    <view v-for="entry in entries" :key="entry.entry_id" class="entry-list__item">
      <button class="entry-list__copy" @click="handleInspect(entry)">
        <text class="entry-list__text">{{ entry.text }}</text>
        <text v-if="entry.phonetic" class="entry-list__phonetic">{{ entry.phonetic }}</text>
        <text v-if="entry.chinese" class="entry-list__chinese">{{ entry.chinese }}</text>
      </button>
      <AudioButton
        v-if="entry.audio"
        :current-key="currentAudioKey"
        :status="status"
        :target="entry.audio"
        @play="handlePlay"
      />
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.entry-list {
  display: grid;
  margin-top: 28rpx;
  gap: 20rpx;

  &__item {
    display: grid;
    align-items: center;
    padding: 28rpx;
    border: 2rpx solid tokens.$color-border;
    border-radius: tokens.$radius-medium;
    background: rgb(255 255 255 / 78%);
    gap: 20rpx;
    grid-template-columns: minmax(0, 1fr) auto;
  }

  &__copy {
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: tokens.$color-text;
    text-align: left;
  }

  &__text,
  &__phonetic,
  &__chinese {
    display: block;
  }

  &__text {
    font-family: Georgia, serif;
    font-size: 34rpx;
    font-weight: 700;
  }

  &__phonetic,
  &__chinese {
    margin-top: 8rpx;
    color: tokens.$color-text-muted;
    font-size: 23rpx;
  }
}
</style>
