<script setup lang="ts">
import type { RecordingSnapshot } from '@/features/recording/recording-machine'
import type { SceneEntry } from '@/shared/contracts/learning'

defineProps<{
  sentence?: SceneEntry
  snapshot: RecordingSnapshot
}>()

const emit = defineEmits<{
  playback: []
  playOriginal: []
  rerecord: []
  start: []
  stop: []
}>()

/** 播放当前句原音。 */
function handleOriginal() {
  emit('playOriginal')
}

/** 开始当前句跟读录音。 */
function handleStart() {
  emit('start')
}

/** 停止当前录音。 */
function handleStop() {
  emit('stop')
}

/** 回听当前句录音。 */
function handlePlayback() {
  emit('playback')
}

/** 删除旧文件并重录当前句。 */
function handleRerecord() {
  emit('rerecord')
}
</script>

<template>
  <view class="recording-controls">
    <template v-if="sentence">
      <text class="recording-controls__position">当前句</text>
      <text class="recording-controls__sentence">
        <text v-if="sentence.speaker" class="recording-controls__speaker">
          {{ sentence.speaker }}:
        </text>
        {{ sentence.text }}
      </text>
      <view class="recording-controls__actions">
        <button class="recording-controls__secondary" @click="handleOriginal">播放原音</button>
        <button
          v-if="snapshot.status !== 'RECORDING'"
          class="recording-controls__primary"
          :disabled="snapshot.recordingDisabled"
          @click="handleStart"
        >
          {{ snapshot.recordingDisabled ? '录音权限未开启' : '开始跟读' }}
        </button>
        <button v-else class="recording-controls__primary" @click="handleStop">停止录音</button>
      </view>
      <view
        v-if="snapshot.status === 'RECORDED' || snapshot.status === 'PLAYBACK'"
        class="recording-controls__actions"
      >
        <button class="recording-controls__secondary" @click="handlePlayback">回听录音</button>
        <button class="recording-controls__secondary" @click="handleRerecord">重新录制</button>
      </view>
      <text class="recording-controls__hint">录音仅保留本次回听，离开场景后自动清除。</text>
    </template>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.recording-controls {
  margin-top: 24rpx;
  padding: 28rpx;
  border-radius: tokens.$radius-large;
  background: rgb(255 255 255 / 78%);

  &__position,
  &__sentence,
  &__hint {
    display: block;
  }

  &__position {
    color: tokens.$color-primary;
    font-size: 22rpx;
    font-weight: 700;
  }

  &__sentence {
    margin-top: 18rpx;
    font-family: Georgia, serif;
    font-size: 29rpx;
    line-height: 1.5;
  }

  &__speaker {
    color: tokens.$color-primary-strong;
    font-weight: 700;
  }

  &__actions {
    display: flex;
    margin-top: 24rpx;
    gap: 16rpx;
  }

  &__primary,
  &__secondary {
    width: 50%;
    min-height: 82rpx;
    margin: 0;
    border-radius: tokens.$radius-medium;
    font-size: 26rpx;
    font-weight: 700;
  }

  &__primary {
    background: tokens.$color-primary;
    color: tokens.$color-white;
  }

  &__secondary {
    border: 2rpx solid tokens.$color-border;
    background: tokens.$color-white;
    color: tokens.$color-primary-strong;
  }

  &__hint {
    margin-top: 14rpx;
    color: tokens.$color-text-muted;
    font-size: 20rpx;
  }
}
</style>
