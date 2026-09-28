<script setup lang="ts">
import AudioButton from '@/features/audio/components/audio-button.vue'

import type { AudioStatus } from '@/features/audio/audio-machine'
import type { AudioTarget, SceneEntry } from '@/shared/contracts/learning'

const props = defineProps<{
  chineseVisible: boolean
  currentAudioKey?: string | null
  entry: SceneEntry
  status: AudioStatus
}>()

const emit = defineEmits<{
  inspect: [entry: SceneEntry]
  play: [target: AudioTarget]
}>()

/** 播放当前句子的音频目标。 */
function handlePlay(target: AudioTarget) {
  emit('play', target)
}

/** 打开与当前句子稳定来源位置关联的词汇详情。 */
function handleInspect() {
  emit('inspect', props.entry)
}
</script>

<template>
  <view :id="entry.source_locator" class="dialogue-sentence">
    <button class="dialogue-sentence__copy" @click="handleInspect">
      <text v-if="entry.speaker" class="dialogue-sentence__speaker">{{ entry.speaker }}:</text>
      <text class="dialogue-sentence__text">{{ entry.text }}</text>
      <text v-if="chineseVisible && entry.chinese" class="dialogue-sentence__chinese">
        {{ entry.chinese }}
      </text>
    </button>
    <AudioButton
      v-if="entry.audio"
      :current-key="currentAudioKey"
      :status="status"
      :target="entry.audio"
      @play="handlePlay"
    />
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.dialogue-sentence {
  display: grid;
  align-items: start;
  padding: 24rpx 0;
  border-bottom: 2rpx solid rgb(201 222 209 / 70%);
  gap: 16rpx;
  grid-template-columns: minmax(0, 1fr) auto;

  &:last-child {
    border-bottom: 0;
  }

  &__copy {
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: tokens.$color-text;
    font-family: Georgia, 'Noto Serif SC', serif;
    font-size: 29rpx;
    line-height: 1.7;
    text-align: left;
  }

  &__speaker {
    color: tokens.$color-primary-strong;
    font-weight: 700;
  }

  &__text {
    margin-left: 6rpx;
  }

  &__chinese {
    display: block;
    color: tokens.$color-text-muted;
    font-family: inherit;
    font-size: 24rpx;
  }
}
</style>
