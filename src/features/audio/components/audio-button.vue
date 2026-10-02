<script setup lang="ts">
import { computed } from 'vue'

import pauseGreen from '@/features/audio/assets/pause-green.svg'
import pauseLarge from '@/features/audio/assets/pause-large.svg'
import pauseWhite from '@/features/audio/assets/pause-white.svg'
import playGreen from '@/features/audio/assets/play-green.svg'
import playLarge from '@/features/audio/assets/play-large.svg'
import playWhite from '@/features/audio/assets/play-white.svg'
import { type AudioStatus, getAudioTargetKey } from '@/features/audio/audio-machine'

import type { AudioTarget } from '@/shared/contracts/learning'

const props = withDefaults(
  defineProps<{
    currentKey?: string | null
    label?: string
    status: AudioStatus
    target: AudioTarget
    variant?: 'compact' | 'large' | 'inline' | 'pill'
    selected?: boolean
  }>(),
  { currentKey: null, label: '播放', variant: 'pill', selected: false }
)
const emit = defineEmits<{ play: [target: AudioTarget] }>()
const isCurrent = computed(() => props.currentKey === getAudioTargetKey(props.target))
const playing = computed(() => isCurrent.value && props.status === 'PLAYING')
const active = computed(
  () =>
    props.selected || (isCurrent.value && (props.status === 'PLAYING' || props.status === 'PAUSED'))
)
const stateLabel = computed(() => {
  if (!isCurrent.value) return props.label
  if (props.status === 'LOADING') return '加载中'
  if (props.status === 'PLAYING') return '暂停'
  if (props.status === 'PAUSED') return '继续'
  if (props.status === 'FAILED') return '重试'
  return props.label
})
const playAsset = computed(() =>
  props.variant === 'large'
    ? playLarge
    : (active.value || props.variant === 'pill') && props.variant !== 'inline'
      ? playWhite
      : playGreen
)
const pauseAsset = computed(() =>
  props.variant === 'large' ? pauseLarge : props.variant === 'inline' ? pauseGreen : pauseWhite
)

/** 将播放意图交给页面，全局控制器保持唯一播放器 */
const handlePlay = () => emit('play', props.target)
</script>

<template>
  <button
    class="audio-button"
    :class="[variant, { active }]"
    :aria-label="stateLabel"
    :disabled="isCurrent && status === 'LOADING'"
    @click.stop="handlePlay"
  >
    <view v-if="playing" class="pause-icon" aria-hidden="true">
      <image class="pause-bar" :src="pauseAsset" mode="aspectFit" />
      <image class="pause-bar" :src="pauseAsset" mode="aspectFit" />
    </view>
    <image v-else class="play-icon" :src="playAsset" mode="aspectFit" aria-hidden="true" />
    <text v-if="variant === 'pill' || variant === 'inline'" class="audio-label">{{
      variant === 'inline' ? (playing ? '暂停原音' : '播放原音') : stateLabel
    }}</text>
  </button>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.audio-button {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: 1px solid #bccdb5;
  border-radius: 50%;
  background: #eff4e9;
  color: tokens.$color-primary;
  gap: 6px;
  line-height: 1;

  &::after {
    border: 0;
  }

  &.active,
  &.large,
  &.pill {
    border-color: tokens.$color-primary;
    background: tokens.$color-primary;
    color: #fff;
  }

  &.compact {
    width: 25px;
    height: 25px;
  }

  &.large {
    width: 36px;
    height: 36px;
  }

  &.pill {
    min-height: 32px;
    padding: 8px 12px;
    border-radius: 18px;
  }

  &.inline {
    min-height: 25px;
    border: 0;
    border-radius: 0;
    background: transparent;
  }

  .play-icon {
    width: 9px;
    height: 11px;
    margin-left: 2px;
  }

  &.large .play-icon {
    width: 14px;
    height: 16px;
    margin-left: 4px;
  }

  .pause-icon {
    display: flex;
    align-items: center;
    gap: 3px;

    .pause-bar {
      width: 3px;
      height: 11px;
    }
  }

  &.large .pause-icon {
    gap: 4px;
  }

  &.large .pause-bar {
    width: 4px;
    height: 15px;
  }

  &.inline .pause-bar {
    width: 3px;
    height: 10px;
  }

  .audio-label {
    font-size: 12px;
  }
}
</style>
