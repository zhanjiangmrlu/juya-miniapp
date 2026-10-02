<script setup lang="ts">
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
        :disabled="snapshot.recordingDisabled || snapshot.status === 'RECORDING'"
        @click="emit('start')"
      >
        ● 开始录音
      </button>
      <button
        class="recording-action"
        :class="{ primary: snapshot.status === 'RECORDING' }"
        :disabled="snapshot.status !== 'RECORDING'"
        @click="emit('stop')"
      >
        ■ 停止
      </button>
      <button
        class="recording-action"
        :class="{ primary: snapshot.hasRecording }"
        :disabled="!snapshot.hasRecording || snapshot.status === 'RECORDING'"
        @click="emit('playback')"
      >
        {{ snapshot.status === 'PLAYBACK' ? 'Ⅱ 暂停回听' : '▶ 当次回听' }}
      </button>
      <button
        class="recording-action"
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
  padding: 9px 13px 12px;
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
    line-height: 25px;
  }

  .recording-sentence {
    display: block;
    margin-top: 7px;
    font-size: 13px;
    font-weight: 500;
    line-height: 24px;
    text-align: center;
    overflow-wrap: anywhere;
  }

  .recording-hint {
    display: block;
    margin-top: 3px;
    color: #748271;
    font-size: 11px;
    line-height: 20px;
  }

  .recording-grid {
    display: grid;
    margin-top: 8px;
    gap: 8px 14px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .recording-action {
    width: 100%;
    min-height: 40px;
    margin: 0;
    padding: 8px 4px;
    border: 1px solid #d6dfc9;
    border-radius: 10px;
    background: #eff3e9;
    color: #4e7f3b;
    font-size: 13px;
    line-height: 22px;

    &.primary {
      border-color: #4e7f3b;
      background: #4e7f3b;
      color: #fff;
    }

    &[disabled] {
      border-color: #d6dfc9;
      background: #f3f4ed;
      color: #879584;
    }
  }
}
</style>
