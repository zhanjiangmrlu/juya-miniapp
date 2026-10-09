<script setup lang="ts">
import pauseReplayWhite from '@/features/audio/assets/pause-replay-white.svg'
import playGreen from '@/features/audio/assets/play-green.svg'
import playWhite from '@/features/audio/assets/play-white.svg'
import AudioButton from '@/features/audio/components/audio-button.vue'

import type { AudioStatus } from '@/features/audio/audio-machine'
import type { RecordingSnapshot } from '@/features/recording/recording-machine'
import type { SceneEntry } from '@/shared/contracts/learning'

withDefaults(
  defineProps<{
    sentence?: SceneEntry
    snapshot: RecordingSnapshot
    index?: number
    total?: number
    currentAudioKey?: string | null
    audioStatus?: AudioStatus
  }>(),
  { sentence: undefined, currentAudioKey: null, index: 1, total: 0, audioStatus: 'IDLE' }
)
const emit = defineEmits<{ playback: []; playOriginal: []; rerecord: []; start: []; stop: [] }>()
</script>
<template>
  <view v-if="sentence" class="recording-controls">
    <view class="recording-top"
      ><text>当前句 {{ index }} / {{ total }}</text
      ><AudioButton
        v-if="sentence.audio"
        variant="inline"
        :current-key="currentAudioKey"
        :status="audioStatus"
        :target="sentence.audio"
        @play="emit('playOriginal')"
    /></view>
    <text class="recording-sentence">{{ sentence.text }}</text
    ><text class="recording-hint">{{
      snapshot.recordingDisabled
        ? '录音权限未开启，仍可播放原音'
        : snapshot.status === 'FAILED'
          ? '录音暂不可用，请重试'
          : '录音仅保留本次回听，不评分'
    }}</text>
    <view class="recording-grid">
      <button
        class="recording-action primary"
        :class="{ 'is-disabled': snapshot.recordingDisabled || snapshot.status === 'RECORDING' }"
        :disabled="snapshot.recordingDisabled || snapshot.status === 'RECORDING'"
        @click="emit('start')"
      >
        ● 开始录音
      </button>
      <button
        class="recording-action"
        :class="{
          primary: snapshot.status === 'RECORDING',
          'is-disabled': snapshot.status !== 'RECORDING'
        }"
        :disabled="snapshot.status !== 'RECORDING'"
        @click="emit('stop')"
      >
        ■ 停止
      </button>
      <button
        class="recording-action"
        :class="{
          primary: snapshot.hasRecording,
          'is-disabled': !snapshot.hasRecording || snapshot.status === 'RECORDING'
        }"
        :disabled="!snapshot.hasRecording || snapshot.status === 'RECORDING'"
        @click="emit('playback')"
      >
        <view v-if="snapshot.status === 'PLAYBACK'" class="recording-pause" aria-hidden="true">
          <image class="pause-bar" :src="pauseReplayWhite" mode="aspectFit" />
          <image class="pause-bar" :src="pauseReplayWhite" mode="aspectFit" />
        </view>
        <image
          v-else
          class="recording-play"
          :class="{ enabled: snapshot.hasRecording && snapshot.status !== 'RECORDING' }"
          :src="snapshot.hasRecording && snapshot.status !== 'RECORDING' ? playWhite : playGreen"
          mode="aspectFit"
          aria-hidden="true"
        />
        <text>{{ snapshot.status === 'PLAYBACK' ? '暂停回听' : '当次回听' }}</text>
      </button>
      <button
        class="recording-action"
        :class="{
          'is-disabled':
            !snapshot.hasRecording || snapshot.status === 'RECORDING' || snapshot.recordingDisabled
        }"
        :disabled="
          !snapshot.hasRecording || snapshot.status === 'RECORDING' || snapshot.recordingDisabled
        "
        @click="emit('rerecord')"
      >
        ↻ 重录
      </button>
    </view>
  </view>
</template>
<style scoped lang="scss">
.recording-controls {
  margin-top: 15px;
  padding: 10px 13px 13px;
  border: 1px solid #d6dfc9;
  border-radius: 14px;
  background: #fffdf7;
  color: #254733;

  .recording-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    font-size: 14px;
    font-weight: 700;
    line-height: 24px;

    :deep(.audio-button.inline) {
      min-height: 24px;
    }
  }

  .recording-sentence {
    display: block;
    margin-top: 6px;
    font-size: 13px;
    font-weight: 500;
    line-height: 24px;
    text-align: center;
    overflow-wrap: anywhere;
  }

  .recording-hint {
    display: block;
    margin-top: 2px;
    color: #748271;
    font-size: 11px;
    line-height: 20px;
  }

  .recording-grid {
    display: grid;
    margin-top: 6px;
    gap: 8px 14px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .recording-action {
    display: flex;
    width: 100%;
    min-height: 40px;
    align-items: center;
    justify-content: center;
    margin: 0;
    padding: 8px 4px;
    border: 1px solid #d6dfc9;
    border-radius: 10px;
    background: #eff3e9;
    color: #4e7f3b;
    font-size: 13px;
    line-height: 22px;
    gap: 6px;

    &.primary {
      border-color: #4e7f3b;
      background: #4e7f3b;
      color: #fff;
    }

    &.is-disabled {
      border-color: #d6dfc9;
      background: #f3f4ed;
      color: #879584;
    }
  }

  .recording-play {
    width: 9px;
    height: 11px;
    opacity: 0.5;

    &.enabled {
      opacity: 1;
    }
  }

  .recording-pause {
    display: flex;
    gap: 4px;

    .pause-bar {
      width: 3px;
      height: 12px;
    }
  }
}
</style>
