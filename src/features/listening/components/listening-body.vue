<script setup lang="ts">
import { computed } from 'vue'

import { useReadingAnchors } from '@/composables/use-reading-anchors'
import { characterFrame, tokenizeBody, validateTimeline } from '@/features/listening/reading-model'
import { ListeningTimelineState } from '@/shared/enums/listening'

import type { ListeningToken } from '@/shared/types/listening'
import type { ListeningBodyProps } from '@/shared/types/listening-components'
const props = defineProps<ListeningBodyProps>()
const { measureReading } = useReadingAnchors()
defineExpose({ measureReading })
const emit = defineEmits<{ lookup: [token: ListeningToken]; browse: [] }>()
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
/** 根据当前媒体时间返回字符颜色，不使用独立CSS动画或墙上时钟
 * @param position 字符的原文code point偏移
 */
const color = (position: number) => {
  if (frame.value.current === position)
    return `color:#1e6b43;background:rgba(220,236,201,${0.25 + frame.value.fraction * 0.75})`
  const trail = frame.value.trails.find((item) => item.position === position)
  return trail ? `color:rgba(30,107,67,${0.45 + trail.strength * 0.55})` : ''
}
/** 按真实表达文本匹配强调，绝不将表达释义冒充词典
 * @param token 正文词项和原文位置
 */
const emphasized = (token: ListeningToken) =>
  (props.article.payload.expressions || []).some((expression) => {
    if (!expression.english) return false
    const body = props.article.payload.body_en
    let from = 0,
      index = body.indexOf(expression.english)
    while (index >= 0) {
      const start = Array.from(body.slice(0, index)).length
      if (token.start >= start && token.end <= start + Array.from(expression.english).length)
        return true
      from = index + expression.english.length
      index = body.indexOf(expression.english, from)
    }
    return false
  })
</script>
<template>
  <view class="reading-body" @touchmove="emit('browse')"
    ><text v-if="!usable" class="timeline-note">本篇暂不支持同步高亮</text
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
            expression: emphasized(token),
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

  .timeline-note {
    display: block;
    margin-bottom: 24rpx;
    font-family: var(--app-font, sans-serif);
    font-size: 22rpx;
    color: #586c5b;
  }
}
</style>
