<script setup lang="ts">
import { computed, inject } from 'vue'

import PronunciationButton from '@/features/audio/components/pronunciation-button.vue'
import { getFavoriteMissingMessage } from '@/features/favorites/favorite-missing-message'
import { getFavoritePronunciation } from '@/features/favorites/favorite-pronunciation'
import { AUDIO_PAGE_OWNER_KEY } from '@/shared/constants/audio-owner'
import { FavoriteType, ReviewCardFace } from '@/shared/enums/favorites'
import { useAudioStore } from '@/stores/audio'

import type { ReviewCardEmits, ReviewCardProps } from '@/shared/types/favorites-components'
const props = defineProps<ReviewCardProps>()
const emit = defineEmits<ReviewCardEmits>()
const audio = useAudioStore()
const owner = inject(AUDIO_PAGE_OWNER_KEY, undefined)
const target = computed(() => getFavoritePronunciation(props.item))
/** 点击英文仅播放本人快照发音，不改变卡面 */
const pressWord = () => {
  if (!target.value) return
  const context = { favorite_id: props.item.id }
  if (owner) void audio.playPronunciation(target.value, context, undefined, owner)
  else void audio.playPronunciation(target.value, context)
}
</script>
<template>
  <view
    class="review-card"
    :class="{ back: face === ReviewCardFace.BACK, phrase: item.entry_type === FavoriteType.PHRASE }"
  >
    <scroll-view class="card-scroll" scroll-y>
      <view class="card-surface" @click="emit('flip')">
        <view class="card-content">
          <PronunciationButton
            v-if="target"
            class="card-audio"
            :target="target"
            :context="{ favorite_id: item.id }"
            @click.stop
          />
          <text class="card-word" @click.stop="pressWord">{{
            item.english || item.normalized_key || '英文待补齐'
          }}</text>
          <text v-if="getFavoriteMissingMessage(item)" class="card-missing">{{
            getFavoriteMissingMessage(item)
          }}</text>
          <template v-if="face === ReviewCardFace.BACK">
            <text v-if="item.phonetic" class="card-phonetic">{{ item.phonetic }}</text>
            <text class="card-translation">{{ item.chinese || '' }}</text>
            <view class="card-source"
              ><text class="card-label">来源句</text
              ><text class="card-text">{{
                item.sources.map((source) => source.sentence_snapshot).join('\n')
              }}</text></view
            >
          </template>
          <text v-else class="card-hint">点击卡片查看释义</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>
<style scoped lang="scss">
.review-card {
  margin-top: 11px;
  border: 1px solid #d6dfc9;
  border-radius: 18px;
  background: #fffdf7;
  color: #254733;

  .card-scroll {
    height: min(427px, max(180px, calc(100vh - 417px)));
  }

  .card-surface {
    display: flex;
    min-height: min(425px, max(178px, calc(100vh - 419px)));
    align-items: center;
    justify-content: center;
    padding: 23px 19px;
    box-sizing: border-box;
    text-align: center;
  }

  .card-content {
    display: flex;
    width: 100%;
    min-width: 0;
    flex-direction: column;
    align-items: center;
  }

  .card-audio {
    margin: 0 0 14px;
  }

  .card-word {
    display: block;
    width: 100%;
    font-size: 36px;
    font-weight: 700;
    line-height: 48px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .card-hint {
    display: block;
    margin-top: 32px;
    color: #758874;
    font-size: 12px;
    line-height: 22px;
  }

  .card-missing {
    width: 100%;
    margin-top: 8px;
    color: #80664c;
    font-size: 12px;
    line-height: 22px;
    overflow-wrap: anywhere;
  }

  .card-phonetic {
    margin-top: 8px;
    color: #6f806e;
    font-size: 16px;
    line-height: 28px;
    overflow-wrap: anywhere;
  }

  .card-translation {
    width: 100%;
    margin-top: 8px;
    color: #4e7f3b;
    font-size: 22px;
    font-weight: 700;
    line-height: 32px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .card-source {
    width: 100%;
    margin-top: 24px;
    padding: 0 4px;
    box-sizing: border-box;
  }

  .card-label {
    display: block;
    color: #718371;
    font-size: 11px;
    line-height: 21px;
  }

  .card-text {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    line-height: 22px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  &.phrase .card-word {
    font-size: 26px;
    line-height: 36px;
  }
}
</style>
