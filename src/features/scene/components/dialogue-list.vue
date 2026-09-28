<script setup lang="ts">
import DialogueSentence from '@/features/scene/components/dialogue-sentence.vue'

import type { AudioStatus } from '@/features/audio/audio-machine'
import type { AudioTarget, SceneEntry } from '@/shared/contracts/learning'

defineProps<{
  chineseVisible: boolean
  currentAudioKey?: string | null
  entries: SceneEntry[]
  status: AudioStatus
}>()

const emit = defineEmits<{
  inspect: [entry: SceneEntry]
  play: [target: AudioTarget]
}>()

/** 透传句子音频播放意图。 */
function handlePlay(target: AudioTarget) {
  emit('play', target)
}

/** 透传句子查看词汇意图。 */
function handleInspect(entry: SceneEntry) {
  emit('inspect', entry)
}
</script>

<template>
  <view class="dialogue-list">
    <DialogueSentence
      v-for="entry in entries"
      :key="entry.entry_id"
      :chinese-visible="chineseVisible"
      :current-audio-key="currentAudioKey"
      :entry="entry"
      :status="status"
      @inspect="handleInspect"
      @play="handlePlay"
    />
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.dialogue-list {
  padding: 0 28rpx;
  border: 2rpx solid rgb(201 222 209 / 70%);
  border-radius: tokens.$radius-large;
  background: rgb(255 255 255 / 80%);
}
</style>
