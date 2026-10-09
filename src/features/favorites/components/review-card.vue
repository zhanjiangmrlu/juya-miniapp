<script setup lang="ts">
import AudioButton from '@/features/audio/components/audio-button.vue'
import { getRuntimeServices } from '@/services/runtime'
import { useAudioStore } from '@/stores/audio'

import type { AudioTarget } from '@/shared/contracts/learning'
import type { ReviewCardEmits, ReviewCardProps } from '@/shared/types/favorites-components'
const props = defineProps<ReviewCardProps>()
const emit = defineEmits<ReviewCardEmits>()
const audio = useAudioStore()
/** 播放独立发音，target 为该收藏版本的音频目标 */
const play = (target: AudioTarget) => audio.play(target, getRuntimeServices().scene)
/** 正面英文翻面，答案英文只在有独立发音时播放且不冒泡翻卡 */
const pressWord = () => {
  if (props.face === 'FRONT') emit('flip')
  else if (props.item.audio) void play(props.item.audio)
}
</script>
<template>
  <view class="review-card" :class="{ back: face === 'BACK' }">
    <button class="card-surface" @click="emit('flip')">
      <text class="card-face"
        >{{ face === 'FRONT' ? '正面' : '背面' }} ·
        {{ item.sources[0]?.scene_title || '来源场景' }}</text
      >
      <text class="card-word" @click.stop="pressWord">{{
        item.english || item.normalized_key
      }}</text>
      <template v-if="face === 'BACK'">
        <text v-if="item.phonetic" class="card-phonetic">{{ item.phonetic }}</text>
        <text class="card-translation">{{ item.chinese || '' }}</text>
        <view class="card-explanation"
          ><text class="card-label">简明解释</text
          ><text class="card-text">{{ item.explanation || item.chinese || '' }}</text
          ><text class="card-label source-label">来源句</text
          ><text class="card-text">{{
            item.sources.map((source) => source.sentence_snapshot).join('\n')
          }}</text></view
        >
      </template>
      <text v-else class="card-hint">点击卡片翻面查看意思</text>
    </button>
    <AudioButton
      v-if="item.audio"
      class="card-audio"
      :target="item.audio"
      :current-key="audio.currentKey"
      :status="audio.snapshot.status"
      @play="play"
    />
  </view>
</template>
<style scoped lang="scss">
.review-card {
  position: relative;
  margin-top: 19px;

  .card-surface {
    display: flex;
    width: 100%;
    min-height: 418px;
    flex-direction: column;
    margin: 0;
    padding: 20px 23px;
    border: 1px solid #d6dfc9;
    border-radius: 18px;
    background: #fffdf7;
    color: #254733;
    text-align: center;

    &::after {
      pointer-events: none;
    }
  }

  .card-face {
    color: #6f806e;
    font-size: 12px;
    line-height: 24px;
  }

  .card-word {
    display: block;
    margin-top: 99px;
    font-size: 46px;
    font-weight: 700;
    line-height: 76px;
    overflow-wrap: anywhere;
  }

  .card-hint {
    display: block;
    margin-top: 109px;
    color: #758874;
    font-size: 12px;
    line-height: 30px;
  }

  .card-audio {
    position: absolute;
    right: 12px;
    bottom: 12px;
  }

  &.back {
    margin-top: 11px;

    .card-surface {
      min-height: 427px;
      padding-top: 17px;
    }

    .card-word {
      margin-top: 19px;
      font-size: 36px;
      line-height: 54px;
    }

    .card-phonetic {
      margin-top: 11px;
      color: #6f806e;
      font-size: 16px;
      line-height: 28px;
    }

    .card-translation {
      margin-top: 17px;
      color: #4e7f3b;
      font-size: 22px;
      font-weight: 700;
      line-height: 37px;
    }

    .card-explanation {
      margin-top: 26px;
      text-align: left;
    }

    .card-label {
      display: block;
      color: #718371;
      font-size: 11px;
      line-height: 21px;
    }

    .card-text {
      display: block;
      min-height: 46px;
      margin-top: 2px;
      font-size: 12px;
      line-height: 20px;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    .source-label {
      margin-top: 10px;
    }
  }
}
</style>
