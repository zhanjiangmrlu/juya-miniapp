<script setup lang="ts">
import { computed } from 'vue'

import pauseGreen from '@/features/audio/assets/pause-green.svg'
import pauseLarge from '@/features/audio/assets/pause-large.svg'
import pauseWhite from '@/features/audio/assets/pause-white.svg'
import playGreen from '@/features/audio/assets/play-green.svg'
import playLarge from '@/features/audio/assets/play-large.svg'
import playWhite from '@/features/audio/assets/play-white.svg'
import { getAudioTargetKey } from '@/features/audio/audio-machine'
import { AudioButtonVariant, AudioStatus } from '@/shared/enums/audio'

import type { AudioButtonEmits, AudioButtonProps } from '@/shared/types/audio-components'

const props = withDefaults(defineProps<AudioButtonProps>(), {
  currentKey: null,
  label: '播放',
  variant: AudioButtonVariant.PILL,
  selected: false
})
const emit = defineEmits<AudioButtonEmits>()
const isCurrent = computed(() => props.currentKey === getAudioTargetKey(props.target))
const playing = computed(() => isCurrent.value && props.status === AudioStatus.PLAYING)
const active = computed(
  () =>
    props.selected ||
    (isCurrent.value &&
      (props.status === AudioStatus.PLAYING || props.status === AudioStatus.PAUSED))
)
const stateLabel = computed(() => {
  if (!isCurrent.value) return props.label
  if (props.status === AudioStatus.LOADING) return '加载中'
  if (props.status === AudioStatus.PLAYING) return '暂停'
  if (props.status === AudioStatus.PAUSED) return '继续'
  if (props.status === AudioStatus.FAILED) return '重试'
  return props.label
})
const playAsset = computed(() =>
  props.variant === AudioButtonVariant.LARGE
    ? playLarge
    : (active.value || props.variant === AudioButtonVariant.PILL) &&
        props.variant !== AudioButtonVariant.INLINE
      ? playWhite
      : playGreen
)
const pauseAsset = computed(() =>
  props.variant === AudioButtonVariant.LARGE
    ? pauseLarge
    : props.variant === AudioButtonVariant.INLINE
      ? pauseGreen
      : pauseWhite
)

/** 将播放意图交给页面，全局控制器保持唯一播放器 */
const handlePlay = () => emit('play', props.target)
</script>

<template>
  <button
    class="audio-button"
    :class="[variant, { active, playing }]"
    :aria-label="stateLabel"
    :disabled="isCurrent && status === AudioStatus.LOADING"
    @click.stop="handlePlay"
  >
    <view v-if="playing" class="pause-icon" aria-hidden="true">
      <image class="pause-bar" :src="pauseAsset" mode="aspectFit" />
      <image class="pause-bar" :src="pauseAsset" mode="aspectFit" />
    </view>
    <image v-else class="play-icon" :src="playAsset" mode="aspectFit" aria-hidden="true" />
    <text
      v-if="variant === AudioButtonVariant.PILL || variant === AudioButtonVariant.INLINE"
      class="audio-label"
      :class="{ wide: variant === AudioButtonVariant.INLINE && playing }"
      >{{
        variant === AudioButtonVariant.INLINE ? (playing ? '暂停原音' : '播放原音') : stateLabel
      }}</text
    >
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
    width: 104px;
    min-height: 25px;
    justify-content: flex-end;
    margin-right: 2px;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: tokens.$color-primary;

    .audio-label {
      font-weight: 500;
      line-height: 23px;
      text-align: right;
    }
  }

  &.inline.playing {
    gap: 7px;
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

    &.wide {
      width: 80px;
      flex: none;
    }
  }
}
</style>
