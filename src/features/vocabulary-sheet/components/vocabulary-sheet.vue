<script setup lang="ts">
import AudioButton from '@/features/audio/components/audio-button.vue'
import { useModalScrollLock } from '@/shared/use-page-scroll-lock'

import type { AudioStatus } from '@/features/audio/audio-machine'
import type { AudioTarget, SceneEntry } from '@/shared/contracts/learning'

withDefaults(
  defineProps<{
    currentAudioKey?: string | null
    entry: SceneEntry
    status: AudioStatus
    sceneTitle?: string
    sourceChinese?: string
  }>(),
  { currentAudioKey: null, sceneTitle: '', sourceChinese: '' }
)
const emit = defineEmits<{
  close: []
  favorite: [entry: SceneEntry]
  play: [target: AudioTarget]
}>()

useModalScrollLock()
</script>
<template>
  <view
    class="vocabulary-sheet"
    role="dialog"
    aria-modal="true"
    aria-label="词汇详情"
    @click.self="emit('close')"
    @touchmove.stop.prevent
  >
    <view class="sheet-panel">
      <view class="sheet-handle" />
      <button class="sheet-close" aria-label="关闭词卡" @click="emit('close')">×</button>
      <view class="sheet-word-row"
        ><text class="sheet-word" :class="{ phrase: entry.entry_type === 'PHRASE' }">{{
          entry.text
        }}</text
        ><AudioButton
          v-if="entry.audio"
          variant="compact"
          :current-key="currentAudioKey"
          :status="status"
          :target="entry.audio"
          @play="emit('play', $event)"
      /></view>
      <text class="sheet-phonetic">{{
        entry.entry_type === 'PHRASE' ? 'Useful Chunk' : entry.phonetic
      }}</text>
      <text v-if="entry.chinese" class="sheet-meaning">{{ entry.chinese }}</text>
      <text class="sheet-explanation">{{ entry.explanation }}</text>
      <view class="sheet-source"
        ><text class="source-label">来源句 · {{ sceneTitle }}</text
        ><text class="source-english">{{ entry.sentence_snapshot }}</text
        ><text v-if="sourceChinese" class="source-chinese">{{ sourceChinese }}</text></view
      >
      <button class="sheet-favorite" :disabled="entry.favorited" @click="emit('favorite', entry)">
        {{
          entry.favorited
            ? '♡  已收藏'
            : entry.entry_type === 'PHRASE'
              ? '♡  收藏语块'
              : '♡  收藏词汇'
        }}
      </button>
      <view class="sheet-safe-indicator" aria-hidden="true" />
    </view>
  </view>
</template>
<style scoped lang="scss">
.vocabulary-sheet {
  position: fixed;
  z-index: 70;
  display: flex;
  align-items: flex-end;
  background: rgb(26 42 33 / 50%);
  inset: 0;

  .sheet-panel {
    position: relative;
    width: 100%;
    max-height: calc(100vh - 80px);
    min-height: 471px;
    overflow-y: auto;
    padding: 36px 30px max(95px, env(safe-area-inset-bottom));
    border-radius: 24px 24px 0 0;
    background: #fffdf7;
  }

  .sheet-handle {
    position: absolute;
    top: 9px;
    left: calc(50% - 25px);
    width: 50px;
    height: 4px;
    border-radius: 2px;
    background: #cbd8c4;
  }

  .sheet-close {
    position: absolute;
    top: 19px;
    right: 18px;
    width: 30px;
    height: 30px;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: #708471;
    font-size: 24px;
    line-height: 30px;
    font-weight: 300;

    &::after {
      border: 0;
    }
  }

  .sheet-word-row {
    display: flex;
    align-items: center;
    padding-right: 20px;
    gap: 12px;
  }

  .sheet-word {
    color: #254733;
    font-size: 30px;
    font-weight: 700;
    line-height: 43px;
    overflow-wrap: anywhere;

    &.phrase {
      font-size: 23px;
    }
  }

  .sheet-phonetic {
    display: block;
    min-height: 27px;
    margin-top: 4px;
    color: #5c715e;
    font-size: 16px;
    line-height: 27px;
  }

  .sheet-meaning {
    display: inline-block;
    margin-top: 9px;
    padding: 4px 20px;
    border-radius: 16px;
    background: #e2eed9;
    color: #254733;
    font-size: 13px;
    font-weight: 700;
    line-height: 23px;
  }

  .sheet-explanation {
    display: block;
    min-height: 47px;
    margin-top: 11px;
    color: #5d6f5e;
    font-size: 13px;
    line-height: 23px;
  }

  .sheet-source {
    min-height: 91px;
    margin-top: 10px;
    padding: 9px 13px;
    border: 1px solid #e1dccf;
    border-radius: 12px;
    background: #f7f1e3;

    text {
      display: block;
    }
  }

  .source-label,
  .source-chinese {
    color: #6f7d70;
    font-size: 11px;
    line-height: 20px;
  }

  .source-english {
    margin-top: 2px;
    color: #254733;
    font-size: 14px;
    line-height: 25px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .source-chinese {
    margin-top: 2px;
  }

  .sheet-favorite {
    width: 100%;
    min-height: 49px;
    margin: 18px 0 0;
    padding: 12px;
    border: 0;
    border-radius: 12px;
    background: #4e7f3b;
    color: #fff;
    font-size: 15px;
    line-height: 25px;
  }

  .sheet-safe-indicator {
    position: absolute;
    bottom: 5px;
    left: calc(50% - 56px);
    width: 112px;
    height: 4px;
    border-radius: 2px;
    background: #254733;
  }
}

@media (width >= 700px) {
  .vocabulary-sheet .sheet-panel {
    max-width: 640px;
    margin: 0 auto;
    border-radius: 24px 24px 0 0;
  }
}
</style>
