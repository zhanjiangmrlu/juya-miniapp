<script setup lang="ts">
import { computed } from 'vue'

import { useReadingAnchors } from '@/composables/use-reading-anchors'
import { phraseHighlights } from '@/features/listening/phrase-highlights'
import { characterFrame, tokenizeBody, validateTimeline } from '@/features/listening/reading-model'
import { vocabularyHighlights } from '@/features/listening/vocabulary-highlights'
import { ListeningTimelineState } from '@/shared/enums/listening'

import type { ListeningToken } from '@/shared/types/listening'
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
/** 保留词汇与表达的字重和色带，并按当前媒体时间叠加字符高亮
 * @param position 字符的原文code point偏移
 */
const color = (position: number) => {
  const word = vocabulary.value.find((item) => position >= item.start && position < item.end),
    phrase = highlights.value.find((item) => position >= item.start && position < item.end),
    weight = word || phrase ? 'font-weight:700;' : ''
  if (frame.value.current === position)
    return `${weight}color:#1e6b43;background:rgba(220,236,201,${0.25 + frame.value.fraction * 0.75})`
  const background = word?.color || phrase?.color
  const trail = frame.value.trails.find((item) => item.position === position)
  return `${weight}${background ? `background:${background};` : ''}${trail ? `color:rgba(30,107,67,${0.45 + trail.strength * 0.55})` : ''}`
}
</script>
<template>
  <view class="reading-body" @touchmove="emit('browse')"
    ><view
      v-for="(paragraph, index) in paragraphs"
      :id="'paragraph-' + index"
      :key="index"
      class="paragraph"
      ><text selectable
        ><text
          v-for="token in paragraph.tokens"
          :id="token.word ? 'reading-word-' + token.start : undefined"
          :key="token.start"
          :data-reading-anchor="token.word ? String(token.start) : undefined"
          :class="{
            'reading-word': token.word,
            'reading-anchor': token.word
          }"
          @click="token.word && emit('lookup', token)"
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
