<script setup lang="ts">
import { computed, ref } from 'vue'

import { audioTime } from '@/features/learning/scene-model'
import { AudioStatus } from '@/shared/enums/audio'

import type { AudioState } from '@/shared/types/audio'
import type { SliderChangeEvent } from '@/shared/types/ui'
const props = defineProps<{ state: AudioState }>()
const emit = defineEmits<{ toggle: []; seek: [seconds: number] }>()
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
        <text>{{
          state.status === AudioStatus.LOADING
            ? '…'
            : state.status === AudioStatus.PLAYING
              ? 'Ⅱ'
              : '▶'
        }}</text>
      </button>
      <view class="audio-copy"
        ><text class="audio-label">完整对话音频</text
        ><text class="audio-english">LISTEN TO THE FULL DIALOGUE</text
        ><text class="duration"
          >{{ audioTime(position) }} / {{ audioTime(state.duration) }} · 整篇播放</text
        ></view
      >
    </view>
    <slider
      :value="position"
      :max="state.duration || 1"
      :min="0"
      :step="0.1"
      :disabled="!state.duration || state.status === AudioStatus.LOADING"
      active-color="#2b4438"
      background-color="#ffffff"
      block-color="#2b4438"
      :block-size="8"
      @changing="changing"
      @change="change"
    />
    <button v-if="state.error" class="text-button error" @click="emit('toggle')">
      {{ state.error }}
    </button>
  </view>
</template>
<style scoped lang="scss">
.audio-player {
  padding: 30.769rpx 30.769rpx 23.077rpx;
  background: #e4f0db;
  border-radius: 23.077rpx;
  margin: 50rpx 0 51.923rpx;

  .audio-top {
    display: flex;
    align-items: center;
    gap: 23.077rpx;
  }

  .audio-copy {
    flex: 1;
    min-width: 0;
  }

  .audio-label {
    display: block;
    font-size: 26.923rpx;
    font-weight: 600;
  }

  .audio-english {
    display: block;
    font-family: 'DM Sans', sans-serif;
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

  slider {
    margin: 25rpx 0 0;
  }

  .error {
    color: #97442d;
    font-size: 23.077rpx;
  }
}
</style>
