<script setup lang="ts">
import { computed } from 'vue'

import AudioButton from '@/features/audio/components/audio-button.vue'
import { createClickableSegments } from '@/features/scene/clickable-segments'
import { AudioButtonVariant } from '@/shared/enums/audio'

import type { ClickableSpan } from '@/shared/contracts/learning'
import type { DialogueSentenceEmits, DialogueSentenceProps } from '@/shared/types/scene-components'

const props = withDefaults(defineProps<DialogueSentenceProps>(), {
  currentAudioKey: null,
  number: undefined,
  catalog: () => [],
  highlighted: false,
  selected: false,
  hideAudio: false,
  audioSelectionVisible: true,
  inspectEnabled: true
})
const emit = defineEmits<DialogueSentenceEmits>()
const segments = computed(() =>
  createClickableSegments(
    props.entry.text,
    props.inspectEnabled ? (props.entry.clickable_spans ?? []) : [],
    props.catalog
  )
)

/** 打开当前句确认的片段，span 为服务端来源与版本定位 */
const inspect = (span?: ClickableSpan) => {
  if (span) emit('inspect', props.entry, span)
  else emit('select', props.entry)
}
</script>
<template>
  <view
    :id="entry.source_locator"
    class="dialogue-sentence"
    :class="{ highlighted, selected, numbered: number, readable: hideAudio }"
    @click="emit('select', entry)"
  >
    <text v-if="number" class="sentence-number">{{ number }}</text>
    <view class="sentence-copy">
      <view class="sentence-line">
        <text v-if="entry.speaker" class="sentence-speaker">{{ entry.speaker }}:</text>
        <text class="sentence-text"
          ><text
            v-for="(segment, index) in segments"
            :key="index"
            :class="{ clickable: segment.span }"
            :role="segment.span ? 'button' : undefined"
            :aria-label="segment.span ? '查看 ' + segment.text : undefined"
            @click.stop="inspect(segment.span)"
            >{{ segment.text }}</text
          ></text
        >
      </view>
      <text v-if="chineseVisible && entry.chinese" class="sentence-chinese">{{
        entry.chinese
      }}</text>
    </view>
    <AudioButton
      v-if="entry.audio && !hideAudio"
      :variant="AudioButtonVariant.COMPACT"
      :selected="audioSelectionVisible && (highlighted || selected)"
      :current-key="currentAudioKey"
      :status="status"
      :target="entry.audio"
      @play="emit('play', $event)"
    />
  </view>
</template>
<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.dialogue-sentence {
  display: flex;
  min-height: 61px;
  align-items: center;
  padding: 12px 14px;
  border: 1px solid tokens.$color-border;
  border-radius: 12px;
  background: tokens.$color-card;
  gap: 10px;

  &.numbered {
    min-height: 60px;
    padding: 11px 10px;
  }

  &.readable {
    min-height: 57px;
    padding: 10px 14px;
  }

  &.highlighted,
  &.selected {
    border-color: #a8c995;
    background: #e2eed9;
  }

  .sentence-copy {
    flex: 1;
    min-width: 0;
  }

  .sentence-line {
    display: flex;
    align-items: baseline;
    gap: 7px;
    color: tokens.$color-text;
    font-size: 12px;
    font-weight: 500;
    line-height: 21px;
  }

  .sentence-speaker {
    flex: none;
    color: tokens.$color-primary;
    font-weight: 700;
  }

  .sentence-text {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .clickable {
    cursor: pointer;
  }

  .sentence-chinese {
    display: block;
    margin-top: 5px;
    color: #748271;
    font-size: 11px;
    line-height: 18px;
  }

  .sentence-number {
    display: grid;
    width: 28px;
    height: 28px;
    flex: none;
    place-items: center;
    margin-right: 9px;
    border-radius: 50%;
    background: #eef2e9;
    color: #718171;
    font-size: 12px;
    font-weight: 700;
  }

  &.selected .sentence-number {
    background: tokens.$color-primary;
    color: #fff;
  }
}

@media (height <= 820px) and (width < 700px) {
  .dialogue-sentence.numbered {
    min-height: 54px;
    padding-top: 8px;
    padding-bottom: 8px;
  }

  .dialogue-sentence.readable {
    min-height: 53px;
    padding-top: 8px;
    padding-bottom: 8px;
  }
}
</style>
