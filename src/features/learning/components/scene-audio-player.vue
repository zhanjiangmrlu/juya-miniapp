<script setup lang="ts">
import { computed, ref } from 'vue'

import AppLoading from '@/components/app-loading/app-loading.vue'
import { audioTime } from '@/features/learning/scene-model'
import { PLAYBACK_RATES } from '@/shared/constants/audio'
import { AudioStatus } from '@/shared/enums/audio'

import type { AudioState } from '@/shared/types/audio'
import type { SliderChangeEvent } from '@/shared/types/ui'
const props = defineProps<{ state: AudioState }>()
const emit = defineEmits<{ toggle: []; seek: [seconds: number]; rate: [value: number] }>()
const ratesOpen = ref(false)
/** 选择倍率后收起选项，由统一控制器确认实际生效
 * @param rate 用户选择的完整音频倍率
 */
const chooseRate = (rate: number) => {
  ratesOpen.value = false
  emit('rate', rate)
}
const dragging = ref(false),
  dragPosition = ref(0)
const position = computed(() => (dragging.value ? dragPosition.value : props.state.position))
/** 拖动期间只更新显示位置，不改变暂停状态
 * @param event 原生滑块的实际秒数
 */
const changing = (event: SliderChangeEvent) => {
  dragging.value = true
  dragPosition.value = event.detail.value
}
/** 释放滑块后交给统一音频控制器
 * @param event 最终选择的秒数
 */
const change = (event: SliderChangeEvent) => {
  dragging.value = false
  emit('seek', event.detail.value)
}
</script>
<template>
  <view class="audio-player">
    <view class="audio-top">
      <button
        class="play"
        :disabled="state.status === AudioStatus.LOADING"
        :aria-label="state.status === AudioStatus.PLAYING ? '暂停完整音频' : '播放完整音频'"
        @click="emit('toggle')"
      >
        <AppLoading
          v-if="state.status === AudioStatus.LOADING"
          compact
          label="正在加载音频"
          icon-only
        /><image
          v-else-if="state.status !== AudioStatus.PLAYING"
          src="/static/design/play.svg"
          mode="aspectFit"
          aria-hidden="true"
        /><text v-else>Ⅱ</text>
      </button>
      <view class="audio-copy"
        ><text class="audio-label">完整对话音频</text
        ><text class="audio-english">LISTEN TO THE FULL DIALOGUE</text
        ><text class="duration"
          >{{ audioTime(position) }} / {{ audioTime(state.duration) }} · 整篇播放</text
        ></view
      >
      <button
        class="rate-toggle"
        data-action="toggle-rate"
        :aria-expanded="ratesOpen"
        @click="ratesOpen = !ratesOpen"
      >
        {{ state.rate }}× 倍速
      </button>
    </view>
    <slider
      :value="position"
      :max="state.duration || 1"
      :min="0"
      :step="0.1"
      :disabled="!state.duration || state.status === AudioStatus.LOADING"
      active-color="#41664d"
      background-color="#d6e2cd"
      block-color="#41664d"
      :block-size="10"
      @changing="changing"
      @change="change"
    />
    <view v-if="ratesOpen" class="rate-options" role="group" aria-label="完整音频倍速">
      <button
        v-for="rate in PLAYBACK_RATES"
        :key="rate"
        :data-rate="rate"
        :class="{ selected: state.rate === rate }"
        :aria-pressed="state.rate === rate"
        @click="chooseRate(rate)"
      >
        {{ rate }}×
      </button>
    </view>
    <text v-if="state.rateError" class="rate-error" role="alert">{{ state.rateError }}</text>
    <button v-if="state.error" class="text-button error" @click="emit('toggle')">
      {{ state.error }}
    </button>
  </view>
</template>
<style scoped lang="scss">
.audio-player {
  padding: 30.769rpx;
  background: #e4f0db;
  border-radius: 23.077rpx;
  margin: 50rpx 0 51.923rpx;

  .audio-top {
    display: flex;
    align-items: center;
    gap: 19.231rpx;
  }

  .audio-copy {
    flex: 1;
    min-width: 0;
  }

  .audio-label {
    display: block;
    font-size: 26.923rpx;
    font-weight: 500;
  }

  .audio-english {
    display: block;
    font-family: var(--app-latin-font, 'DM Sans', sans-serif);
    font-size: 17.308rpx;
    font-weight: 500;
    letter-spacing: 0.08em;
    line-height: 1.6;
    color: #4f6d55;
    margin-top: 5.769rpx;
  }

  .duration {
    display: block;
    font-size: 21.154rpx;
    color: #4f6d55;
    margin-top: 5.769rpx;
  }

  .play {
    width: 84.615rpx;
    height: 84.615rpx;
    border: 0;
    border-radius: 50%;
    background: #bedda7;
    color: #2b4438;
    padding: 0;
    flex-shrink: 0;
    font-size: 30.769rpx;
  }

  .play image {
    width: 38.462rpx;
    height: 38.462rpx;
  }

  slider {
    margin: 25rpx 0 0;
  }

  .rate-toggle {
    flex-shrink: 0;
    width: 107.115rpx;
    min-height: 84.615rpx;
    border: 1px solid #b8cdb0;
    border-radius: 15.385rpx;
    padding: 7.692rpx;
    background: #fffcf5;
    font-size: 23.077rpx;
    white-space: nowrap;
  }

  .rate-options {
    display: flex;
    gap: 7.692rpx;
    margin-top: 23.077rpx;
    border-top: 1px solid #b8cdb0;
    padding-top: 23.077rpx;

    button {
      flex: 1;
      min-width: 0;
      min-height: 84.615rpx;
      border: 1px solid transparent;
      border-radius: 15.385rpx;
      padding: 7.692rpx 0;
      font-family: var(--app-latin-font, 'DM Sans', sans-serif);
      font-size: 25rpx;
      background: #fffcf5;
    }

    .selected {
      border-color: #8db972;
      background: #bedda7;
    }
  }

  .rate-error {
    display: block;
    margin-top: 15.385rpx;
    color: #97442d;
    font-size: 23.077rpx;
  }

  .error {
    color: #97442d;
    font-size: 23.077rpx;
  }
}
</style>
