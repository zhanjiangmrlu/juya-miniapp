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
  <view class="audio-player"
    ><view class="between"
      ><text class="audio-label">完整音频</text
      ><text class="duration"
        >{{ audioTime(position) }} / {{ audioTime(state.duration) }}</text
      ></view
    ><view class="player-controls"
      ><button
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
        }}</text></button
      ><slider
        :value="position"
        :max="state.duration || 1"
        :min="0"
        :step="0.1"
        :disabled="!state.duration || state.status === AudioStatus.LOADING"
        active-color="#347553"
        background-color="#dce2d5"
        block-color="#347553"
        :block-size="14"
        @changing="changing"
        @change="change" /></view
    ><button v-if="state.error" class="text-button error" @click="emit('toggle')">
      {{ state.error }}
    </button></view
  >
</template>
<style scoped lang="scss">
.audio-player {
  padding: 28rpx;
  background: #eef3e9;
  border-radius: 20rpx;
  margin-top: 36rpx;

  .audio-label {
    font-size: 26rpx;
    font-weight: 600;
  }

  .duration {
    font-size: 22rpx;
    color: #637268;
  }

  .player-controls {
    display: flex;
    align-items: center;
    gap: 20rpx;
    margin-top: 18rpx;

    .play {
      width: 76rpx;
      height: 76rpx;
      border: 0;
      border-radius: 50%;
      background: #347553;
      color: #fff;
      padding: 0;
      flex-shrink: 0;
      font-size: 28rpx;
    }

    slider {
      flex: 1;
      margin: 0 8rpx;
    }
  }

  .error {
    color: #a23f35;
    font-size: 22rpx;
  }
}
</style>
