<script setup lang="ts">
import { computed } from 'vue'

import PronunciationButton from '@/features/audio/components/pronunciation-button.vue'
import { useAudioStore } from '@/stores/audio'

import type { SceneWordCardEmits, SceneWordCardProps } from '@/shared/types/scene-components'

const props = withDefaults(defineProps<SceneWordCardProps>(), { pending: false, chunk: false })
const emit = defineEmits<SceneWordCardEmits>()
const audio = useAudioStore()
const context = computed(() => ({
  content_type: props.entry.content_type ?? 'dialogue',
  content_id: props.entry.scene_id,
  content_version: props.contentVersion,
  entry_id: props.entry.entry_id,
  sense_id: props.entry.sense_id,
  source_id: props.entry.source_id
}))
/** 播放本篇已确认目标，不提交任意英文合成 */
const pronounce = () => {
  if (props.entry.pronunciation)
    void audio.playPronunciation(props.entry.pronunciation, context.value)
}
</script>
<template>
  <view class="scene-word-card" :class="{ chunk }">
    <view class="word-copy">
      <view class="word-line">
        <text class="word-english" @click.stop="pronounce">{{ entry.text }}</text>
        <PronunciationButton :target="entry.pronunciation ?? undefined" :context="context" />
      </view>
      <text v-if="entry.phonetic && !chunk" class="word-phonetic">{{ entry.phonetic }}</text>
      <view v-if="!chunk" class="word-image"
        ><image v-if="entry.image_url" :src="entry.image_url" mode="aspectFit"
      /></view>
      <text class="word-meaning">{{ entry.chinese }}</text>
    </view>
    <button
      class="favorite-button"
      :disabled="pending"
      :aria-busy="pending"
      @click.stop="emit('favorite', entry)"
    >
      {{ entry.favorited ? '已收藏' : '收藏' }}<text v-if="pending" class="pending-mark"> ·</text>
    </button>
  </view>
</template>
<style scoped lang="scss">
.scene-word-card {
  display: flex;
  min-width: 0;
  min-height: 246px;
  flex-direction: column;
  padding: 12px;
  border: 1px solid #d9e4d2;
  border-radius: 12px;
  background: #fffdf7;
  gap: 6px;

  .word-copy {
    flex: 1;
    min-width: 0;
  }

  .word-line {
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }

  .word-english {
    flex: 1;
    min-width: 0;
    padding-top: 8px;
    color: #254733;
    font-size: 17px;
    font-weight: 700;
    line-height: 22px;
    overflow-wrap: anywhere;
  }

  .word-phonetic {
    display: block;
    color: #748271;
    font-size: 12px;
    line-height: 18px;
    overflow-wrap: anywhere;
  }

  .word-image {
    display: flex;
    min-height: 68px;
    align-items: center;
    justify-content: center;
    margin: 6px 0;

    image {
      width: 68px;
      height: 68px;
    }
  }

  .word-meaning {
    display: flex;
    min-height: 28px;
    align-items: center;
    justify-content: center;
    color: #254733;
    font-size: 13px;
    line-height: 18px;
    text-align: center;
    overflow-wrap: anywhere;
  }

  .favorite-button {
    width: 100%;
    min-height: 44px;
    margin: 0;
    padding: 8px;
    border-radius: 10px;
    background: #e2eed9;
    color: #4e7f3b;
    font-size: 13px;
    line-height: 22px;

    &::after {
      border: 0;
    }

    &[disabled] {
      color: #4e7f3b;
      opacity: 0.7;
    }
  }

  &.chunk {
    min-height: 94px;
    flex-direction: row;
    align-items: center;
    padding: 14px;
    gap: 14px;

    .word-line {
      align-items: flex-start;
    }

    .word-english {
      flex: 0 1 auto;
      max-width: calc(100% - 28px);
      padding-top: 0;
    }

    :deep(.pronunciation-button) {
      margin: -11px -12px -11px 0;
    }

    .word-meaning {
      display: block;
      margin-top: 4px;
      text-align: left;
      line-height: 22px;
    }

    .favorite-button {
      width: 72px;
      flex: none;
    }
  }
}
</style>
