<script setup lang="ts">
import { computed } from 'vue'

import { type AudioStatus, getAudioTargetKey } from '@/features/audio/audio-machine'

import type { AudioTarget } from '@/shared/contracts/learning'

const props = withDefaults(
  defineProps<{
    currentKey?: string | null
    label?: string
    status: AudioStatus
    target: AudioTarget
  }>(),
  { currentKey: null, label: '播放' }
)

const emit = defineEmits<{
  play: [target: AudioTarget]
}>()

const isCurrent = computed(() => props.currentKey === getAudioTargetKey(props.target))
const stateLabel = computed(() => {
  if (!isCurrent.value) return props.label
  if (props.status === 'LOADING') return '加载中'
  if (props.status === 'PLAYING') return '暂停'
  if (props.status === 'PAUSED') return '继续'
  if (props.status === 'FAILED') return '重试'
  return props.label
})

/** 将播放意图交给全局音频 Store，组件只负责呈现状态。 */
function handlePlay() {
  emit('play', props.target)
}
</script>

<template>
  <button
    class="audio-button"
    :class="{ 'audio-button--active': isCurrent && status === 'PLAYING' }"
    :aria-label="stateLabel"
    @click.stop="handlePlay"
  >
    <text class="audio-button__icon">{{ isCurrent && status === 'PLAYING' ? 'Ⅱ' : '▶' }}</text>
    <text class="audio-button__label">{{ stateLabel }}</text>
  </button>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.audio-button {
  display: inline-flex;
  min-width: 64rpx;
  min-height: 64rpx;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 12rpx 16rpx;
  border: 0;
  border-radius: tokens.$radius-pill;
  background: tokens.$color-primary-strong;
  color: tokens.$color-white;
  gap: 8rpx;

  &--active {
    background: tokens.$color-primary;
  }

  &__icon {
    font-size: 18rpx;
  }

  &__label {
    font-size: 20rpx;
  }
}
</style>
