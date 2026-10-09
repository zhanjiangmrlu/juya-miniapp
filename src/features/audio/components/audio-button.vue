<script setup lang="ts">
import { computed } from 'vue'

import { getAudioTargetKey } from '@/features/audio/audio-machine'
import { AUDIO_BUTTON_ASSETS, AUDIO_STATUS_LABELS } from '@/shared/constants/audio'
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
/** 当前资源使用播放状态文案，其他资源沿用调用方标签 */
const stateLabel = computed(() => {
  if (!isCurrent.value) return props.label
  if (Object.prototype.hasOwnProperty.call(AUDIO_STATUS_LABELS, props.status))
    return AUDIO_STATUS_LABELS[props.status] ?? props.label
  return props.label
})
/** 未识别样式沿用紧凑按钮的图标规则 */
const assets = computed(() => {
  if (Object.prototype.hasOwnProperty.call(AUDIO_BUTTON_ASSETS, props.variant))
    return AUDIO_BUTTON_ASSETS[props.variant]
  return AUDIO_BUTTON_ASSETS[AudioButtonVariant.COMPACT]
})
/** 根据按钮样式与选中状态读取播放图标 */
const playAsset = computed(() => assets.value[active.value ? 'activePlay' : 'play'])
/** 暂停图标只取决于按钮展示样式 */
const pauseAsset = computed(() => assets.value.pause)
/** 行内按钮显示原音操作，其他样式显示资源状态 */
const displayLabel = computed(() => {
  if (props.variant === AudioButtonVariant.INLINE) return playing.value ? '暂停原音' : '播放原音'
  return stateLabel.value
})

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
      >{{ displayLabel }}</text
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
