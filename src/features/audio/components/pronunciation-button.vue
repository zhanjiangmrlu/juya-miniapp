<script setup lang="ts">
import { computed } from 'vue'

import pronunciationError from '@/features/audio/assets/pronunciation-error.svg'
import pronunciationIdle from '@/features/audio/assets/pronunciation-idle.svg'
import { getAudioTargetKey } from '@/features/audio/audio-machine'
import {
  canPronounceTarget,
  getPronunciationAudioTarget
} from '@/features/audio/pronunciation-controller'
import { AudioStatus, PronunciationStatus } from '@/shared/enums/audio'
import { useAudioStore } from '@/stores/audio'

import type { PronunciationButtonProps } from '@/shared/types/audio-components'

const props = defineProps<PronunciationButtonProps>()
const audio = useAudioStore()
const current = computed(
  () =>
    props.target &&
    audio.currentKey === getAudioTargetKey(getPronunciationAudioTarget(props.target, props.context))
)
const unavailable = computed(
  () =>
    !canPronounceTarget(props.target) ||
    (current.value && audio.snapshot.pronunciationStatus === PronunciationStatus.UNAVAILABLE)
)
const loading = computed(() => current.value && audio.snapshot.status === AudioStatus.LOADING)
const failed = computed(() => current.value && audio.snapshot.status === AudioStatus.FAILED)
const playing = computed(() => current.value && audio.snapshot.status === AudioStatus.PLAYING)
const label = computed(() =>
  loading.value
    ? '加载发音'
    : failed.value
      ? audio.snapshot.canRetry === false
        ? '发音暂不可用'
        : '重试发音'
      : playing.value
        ? '暂停发音'
        : '播放发音'
)
/** 点击只提交当前确认目标，与收藏、详情及翻面事件隔离 */
const play = () => {
  if (props.target) void audio.playPronunciation(props.target, props.context)
}
</script>
<template>
  <button
    v-if="target && !unavailable"
    class="pronunciation-button"
    :class="{ playing }"
    :aria-label="label"
    :disabled="Boolean(loading || (failed && audio.snapshot.canRetry === false))"
    @click.stop="play"
  >
    <view v-if="loading" class="pronunciation-loading" aria-hidden="true" />
    <image
      v-else
      class="pronunciation-icon"
      :src="failed ? pronunciationError : pronunciationIdle"
      mode="aspectFit"
      aria-hidden="true"
    />
  </button>
</template>
<style scoped lang="scss">
.pronunciation-button {
  display: inline-flex;
  width: 44px;
  min-width: 44px;
  height: 44px;
  flex: none;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  line-height: 1;

  &::after {
    border: 0;
  }

  .pronunciation-icon {
    width: 20px;
    height: 20px;
  }

  .pronunciation-loading {
    width: 16px;
    height: 16px;
    border: 2px solid #d9e4d2;
    border-top-color: #4e7f3b;
    border-radius: 50%;
    animation: pronunciation-spin 800ms linear infinite;
  }

  &.playing .pronunciation-icon {
    animation: pronunciation-wave 900ms ease-in-out infinite;
  }
}

@keyframes pronunciation-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes pronunciation-wave {
  50% {
    opacity: 0.55;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pronunciation-button {
    .pronunciation-loading,
    .pronunciation-icon {
      animation: none;
    }
  }
}
</style>
