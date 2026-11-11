<script setup lang="ts">
import { computed } from 'vue'

import { useReadingAnchors } from '@/composables/use-reading-anchors'
import { LEARNING_FEATURES } from '@/shared/constants/learning-features'
import { ListeningTimelineState } from '@/shared/enums/listening'
import { phraseHighlights } from '@/sub-packages/listening/phrase-highlights'
import {
  characterFrame,
  tokenizeBody,
  validateTimeline
} from '@/sub-packages/listening/reading-model'
import { vocabularyHighlights } from '@/sub-packages/listening/vocabulary-highlights'

import type { ListeningTextRun, ListeningToken } from '@/shared/types/listening'
import type { ListeningBodyProps } from '@/shared/types/listening-components'
const props = defineProps<ListeningBodyProps>()
const { measureReading } = useReadingAnchors()
defineExpose({ measureReading })
const emit = defineEmits<{ lookup: [token: ListeningToken]; browse: [] }>()
const highlights = computed(() =>
  phraseHighlights(
    props.article.payload.body_en,
    (props.article.payload.expressions || []).map((item) => item.english)
  )
)
const vocabulary = computed(() =>
  vocabularyHighlights(props.article.payload.body_en, props.article.payload.vocabulary || [])
)
const paragraphs = computed(() => tokenizeBody(props.article.payload.body_en))
const usable = computed(
  () =>
    LEARNING_FEATURES.listeningSync &&
    props.article.timeline.state === ListeningTimelineState.READY &&
    validateTimeline(
      props.article.payload.body_en,
      props.article.timeline.words || [],
      props.duration * 1000
    )
)
const frame = computed(() =>
  characterFrame(
    usable.value ? props.article.timeline.words || [] : [],
    props.milliseconds,
    props.ended
  )
)
/** 只计算原文精确范围内的词汇与表达静态色带
 * @param position 字符的原文code point偏移
 */
const staticColor = (position: number) => {
  const word = vocabulary.value.find((item) => position >= item.start && position < item.end),
    phrase = highlights.value.find((item) => position >= item.start && position < item.end),
    weight = word || phrase ? 'font-weight:700;' : '',
    background = word?.color || phrase?.color
  return `${weight}${background ? `background:${background};` : ''}`
}
/** 合并相邻同样式文字，保留词内色带边界，不因播放时钟重新拆字 */
const staticRuns = computed(() => {
  const result = new Map<number, ListeningTextRun[]>()
  for (const paragraph of paragraphs.value) {
    for (const token of paragraph.tokens) {
      const runs: ListeningTextRun[] = []
      for (const [offset, character] of Array.from(token.text).entries()) {
        const style = staticColor(token.start + offset),
          last = runs[runs.length - 1]
        if (last?.style === style) last.text += character
        else runs.push({ text: character, style })
      }
      result.set(token.start, runs)
    }
  }
  return result
})
/** 在静态色带上叠加保留的动态高亮与尾迹，仅恢复开关后使用
 * @param position 字符的原文code point偏移
 */
const color = (position: number) => {
  const base = staticColor(position)
  if (frame.value.current === position)
    return `${base}color:#1e6b43;background:rgba(220,236,201,${0.25 + frame.value.fraction * 0.75})`
  const trail = frame.value.trails.find((item) => item.position === position)
  return `${base}${trail ? `color:rgba(30,107,67,${0.45 + trail.strength * 0.55})` : ''}`
}
</script>
<template>
  <view class="reading-body" @touchmove="emit('browse')"
    ><view
      v-for="(paragraph, index) in paragraphs"
      :id="'paragraph-' + index"
      :key="index"
      class="paragraph"
      ><text
        v-if="!LEARNING_FEATURES.dictionary && !LEARNING_FEATURES.listeningSync"
        selectable
        :user-select="true"
      >
        <text
          v-for="token in paragraph.tokens"
          :id="token.word ? 'reading-word-' + token.start : undefined"
          :key="token.start"
          :data-reading-anchor="token.word ? String(token.start) : undefined"
          :class="{ 'reading-word': token.word, 'reading-anchor': token.word }"
          ><text
            v-for="(run, runIndex) in staticRuns.get(token.start)"
            :key="runIndex"
            :style="run.style"
            >{{ run.text }}</text
          ></text
        > </text
      ><text v-else selectable :user-select="true"
        ><text
          v-for="token in paragraph.tokens"
          :id="token.word ? 'reading-word-' + token.start : undefined"
          :key="token.start"
          :data-reading-anchor="token.word ? String(token.start) : undefined"
          :class="{
            'reading-word': token.word,
            'reading-anchor': token.word
          }"
          @click="LEARNING_FEATURES.dictionary && token.word && emit('lookup', token)"
          ><text
            v-for="(character, offset) in Array.from(token.text)"
            :key="offset"
            :style="color(token.start + offset)"
            >{{ character }}</text
          ></text
        ></text
      ></view
    ></view
  >
</template>
<style scoped lang="scss">
.reading-body {
  font-family: var(--app-latin-font, 'DM Sans', sans-serif);
  font-size: 32.692rpx;
  line-height: 1.85;
  overflow-wrap: break-word;

  .paragraph {
    margin-bottom: 30rpx;
    text-indent: 2em;
    white-space: pre-wrap;
  }

  .expression {
    font-weight: 600;
  }
}
</style>
