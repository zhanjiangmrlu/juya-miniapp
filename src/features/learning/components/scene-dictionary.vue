<script setup lang="ts">
import { computed } from 'vue'

import { AudioStatus } from '@/shared/enums/audio'
import { DictionarySource } from '@/shared/enums/dictionary'

import type { SceneDictionaryProps } from '@/shared/types/learning-components'
const props = defineProps<SceneDictionaryProps>()
defineEmits<{ close: []; retry: []; play: [] }>()
const hasDefinition = computed(() =>
  Boolean(
    props.result &&
    props.result.source !== DictionarySource.MISSING &&
    props.result.definitions?.length
  )
)
const hasLemma = computed(() =>
  Boolean(
    props.result?.lemma && props.result.lemma.toLowerCase() !== props.selection.word.toLowerCase()
  )
)
const badge = computed(() =>
  props.result
    ? props.result.source === DictionarySource.CONTEXT
      ? '本篇释义'
      : '词典释义'
    : '正文查词'
)
/** 按内容估计可视高度，超长释义在同一中央弹窗内滚动 */
const panelHeight = computed(() => {
  const info =
    typeof uni !== 'undefined' && typeof uni.getWindowInfo === 'function'
      ? uni.getWindowInfo()
      : { windowHeight: 844, windowWidth: 390 }
  const lines =
    props.result?.definitions?.reduce(
      (sum, definition) =>
        sum +
        Math.max(1, Math.ceil((definition.meaning.length + definition.part_of_speech.length) / 16)),
      0
    ) || 1
  let height = hasDefinition.value
    ? 332.8 +
      (hasLemma.value ? 33.8 : 0) -
      (props.result?.phonetic ? 0 : 30.8) +
      Math.max(0, lines - 1) * 34.2
    : 305.4
  if (props.voiceError) height += 30
  return Math.min((info.windowHeight || 844) * 0.78, (height * (info.windowWidth || 390)) / 390)
})
</script>
<template>
  <view
    class="dictionary-veil"
    role="dialog"
    aria-modal="true"
    aria-label="正文查词"
    @click="$emit('close')"
    @touchmove.stop.prevent
  >
    <view class="dictionary-dialog" @click.stop>
      <scroll-view
        class="dictionary-scroll"
        scroll-y
        :style="{ height: `${panelHeight}px` }"
        @touchmove.stop
      >
        <view class="dictionary-content">
          <view class="dictionary-head between"
            ><text class="dictionary-source">{{ badge }}</text
            ><button class="dictionary-close" aria-label="关闭查词" @click="$emit('close')">
              <image
                src="/static/design/dictionary-close.svg"
                mode="aspectFit"
                aria-hidden="true"
              /></button
          ></view>
          <text class="dictionary-word">{{ selection.word }}</text>
          <text v-if="hasLemma" class="dictionary-lemma">原形 {{ result?.lemma }}</text>
          <text
            v-if="result?.phonetic"
            class="dictionary-phonetic"
            :class="{ 'after-lemma': hasLemma }"
            >{{ result.phonetic }}</text
          >
          <view v-if="busy" class="dictionary-status" aria-live="polite">正在查询…</view>
          <template v-else-if="error"
            ><text class="dictionary-status">释义查询失败，请重试。</text
            ><text class="dictionary-detail-error" role="alert">{{ error }}</text
            ><button class="primary dictionary-retry" @click="$emit('retry')">
              重试查询
            </button></template
          >
          <template v-else-if="hasDefinition"
            ><view class="dictionary-meanings"
              ><view
                v-for="(definition, index) in result?.definitions"
                :key="index"
                class="dictionary-definition"
                ><text v-if="definition.part_of_speech" class="part-of-speech"
                  >{{ definition.part_of_speech }} </text
                ><text>{{ definition.meaning }}</text></view
              ></view
            ><button
              class="primary dictionary-voice"
              :disabled="voiceStatus === AudioStatus.LOADING"
              @click="$emit('play')"
            >
              <image
                v-if="voiceStatus !== AudioStatus.LOADING"
                src="/static/design/dictionary-speaker.svg"
                mode="aspectFit"
                aria-hidden="true"
              />{{
                voiceStatus === AudioStatus.LOADING
                  ? '正在准备发音…'
                  : voiceStatus === AudioStatus.PLAYING
                    ? '重新播放单词发音'
                    : '播放单词发音'
              }}</button
            ><text v-if="voiceError" class="dictionary-detail-error" role="alert">{{
              voiceError
            }}</text></template
          >
          <template v-else-if="result"
            ><text class="dictionary-status">暂未找到这个单词的释义。</text
            ><text class="dictionary-missing-help">已保留你点击的原词，可稍后重试。</text
            ><button class="text-button dictionary-retry" @click="$emit('retry')">
              重新查询
            </button></template
          >
          <text class="dictionary-help">点击喇叭才发音 · 整篇音频需手动继续</text>
        </view>
      </scroll-view>
    </view>
  </view>
</template>
<style scoped lang="scss">
.dictionary-veil {
  position: fixed;
  inset: 0;
  z-index: 110;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48.077rpx;
  background: rgb(43 68 56 / 30%);

  .dictionary-dialog {
    width: 100%;
    max-width: 653.846rpx;
    border-radius: 26.923rpx;
    overflow: hidden;
    background: #fffcf5;
  }

  .dictionary-content {
    padding: 46.154rpx;
  }

  .dictionary-head {
    position: sticky;
    top: 0;
    z-index: 1;
    min-height: 84.615rpx;
    background: #fffcf5;
  }

  .dictionary-source {
    padding: 9.615rpx 19.231rpx;
    background: #e4f0db;
    color: #41664d;
    font-size: 25rpx;
    line-height: 41.25rpx;
    border-radius: 7.692rpx;
  }

  .dictionary-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 84.615rpx;
    height: 84.615rpx;
    padding: 0;
    border: 0;
    background: none;

    image {
      width: 38.462rpx;
      height: 38.462rpx;
    }
  }

  .dictionary-word {
    display: block;
    margin-top: 34.615rpx;
    font-family: 'DM Sans', sans-serif;
    font-size: 57.692rpx;
    font-weight: 700;
    line-height: 75rpx;
    overflow-wrap: anywhere;
  }

  .dictionary-lemma,
  .dictionary-phonetic,
  .dictionary-status,
  .dictionary-missing-help,
  .dictionary-help,
  .dictionary-detail-error {
    display: block;
    color: #586c5b;
    font-size: 23.077rpx;
    line-height: 43.846rpx;
    overflow-wrap: anywhere;
  }

  .dictionary-lemma {
    margin-top: 7.692rpx;
  }

  .dictionary-phonetic {
    margin-top: 15.385rpx;

    &.after-lemma {
      margin-top: 28.846rpx;
    }
  }

  .dictionary-meanings {
    margin-top: 34.615rpx;
  }

  .dictionary-definition {
    color: #586c5b;
    font-size: 34.615rpx;
    line-height: 65.769rpx;
    overflow-wrap: anywhere;

    .part-of-speech {
      font-family: 'DM Sans', sans-serif;
      font-size: 25rpx;
    }
  }

  .dictionary-status {
    margin-top: 7.692rpx;
  }

  .dictionary-missing-help {
    margin-top: 28.846rpx;
  }

  .dictionary-voice {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 13.462rpx;
    width: 100%;
    min-height: 76.923rpx;
    padding: 15.385rpx;
    margin-top: 46.154rpx;

    image {
      width: 38.462rpx;
      height: 38.462rpx;
    }
  }

  .dictionary-help {
    margin-top: 26.923rpx;
  }

  .dictionary-detail-error {
    margin-top: 13.462rpx;
    color: #ad4f32;
  }

  .dictionary-retry {
    width: 100%;
    margin-top: 28.846rpx;
    min-height: 76.923rpx;
  }
}
</style>
