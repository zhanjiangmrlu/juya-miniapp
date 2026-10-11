<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, ref, watch } from 'vue'

import { AudioStatus } from '@/shared/enums/audio'

import type { ShortReadingPosition } from '@/shared/contracts/short-reading'
import type {
  ShortReadingGeometry,
  ShortReadingPageViewProps
} from '@/shared/types/short-reading-components'

const props = withDefaults(defineProps<ShortReadingPageViewProps>(), {
  audioStatus: AudioStatus.IDLE,
  errorMessage: '',
  position: undefined,
  initialPosition: undefined,
  sourceParagraphId: undefined
})
const emit = defineEmits<{
  toggleTag: [tag: 'category' | 'level']
  toggleTranslation: []
  play: []
  complete: []
  position: [position: ShortReadingPosition]
}>()
const instance = getCurrentInstance()
const scrollTop = ref(0)
let actualScrollTop = 0
let scrollTimer: ReturnType<typeof globalThis.setTimeout> | undefined
let disposed = false
const sourceHighlight = ref<string>()
let highlightTimer: ReturnType<typeof globalThis.setTimeout> | undefined

const audioLabel = computed(() => {
  if (props.audioStatus === AudioStatus.LOADING) return '正在加载全文'
  if (props.audioStatus === AudioStatus.FAILED) return '重试播放全文'
  if (props.audioStatus === AudioStatus.PLAYING) return '暂停全文'
  if (props.audioStatus === AudioStatus.PAUSED) return '继续播放全文'
  return '播放全文'
})
const duration = computed(() => {
  const seconds = Math.floor((props.reading.whole_audio?.duration_ms ?? 0) / 1000)
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
})

/** 查询英文段落位置，callback 接收可见区及当前渲染的段落边界 */
const queryParagraphs = (
  callback: (viewport: ShortReadingGeometry, paragraphs: ShortReadingGeometry[]) => void
) => {
  if (disposed || !instance?.proxy || typeof uni === 'undefined' || !uni.createSelectorQuery) return
  const query = uni.createSelectorQuery().in(instance.proxy)
  query.select('.reading-scroll').boundingClientRect()
  query.selectAll('.short-reading-paragraph').boundingClientRect()
  query.exec((result) => {
    if (!disposed && result[0] && result[1]?.length) callback(result[0], result[1])
  })
}

/** 恢复当前版本的英文段落锚点，bookmark 为服务端返回或切译文前捕获的位置 */
const restorePosition = (bookmark?: ShortReadingPosition) => {
  const reading = props.reading
  const index = bookmark
    ? reading.paragraphs_en.findIndex((item) => item.paragraph_id === bookmark.paragraph_id)
    : -1
  if (index < 0) return
  queryParagraphs((viewport, paragraphs) => {
    if (props.reading !== reading || !paragraphs[index]) return
    scrollTop.value = Math.max(
      0,
      actualScrollTop + (paragraphs[index].top ?? 0) - (viewport.top ?? 0) + (bookmark?.offset ?? 0)
    )
  })
}

/** 获取真正可见的英文锚点，callback 在布局测量完成后接收段落与偏移 */
const capturePosition = (callback: (bookmark: ShortReadingPosition) => void) => {
  const reading = props.reading
  queryParagraphs((viewport, paragraphs) => {
    if (props.reading !== reading) return
    const top = viewport.top ?? 0
    let index = paragraphs.findIndex((rect) => (rect.bottom ?? 0) > top)
    if (index < 0) index = paragraphs.length - 1
    if (!reading.paragraphs_en[index]) return
    const height = paragraphs[index].height ?? 0
    callback({
      paragraph_id: reading.paragraphs_en[index].paragraph_id,
      offset: Math.max(0, Math.min(height, Math.round(top - (paragraphs[index].top ?? top))))
    })
  })
}

/** 记录滚动后首个可见英文段落，event 为scroll-view的实际滚动值 */
const handleScroll = (event: { detail: { scrollTop: number } }) => {
  actualScrollTop = event.detail.scrollTop
  if (scrollTimer) globalThis.clearTimeout(scrollTimer)
  scrollTimer = globalThis.setTimeout(
    () => capturePosition((bookmark) => emit('position', bookmark)),
    150
  )
}

/** 展开或收起全文译文后恢复英文锚点，不发送标签或翻译状态进度 */
const toggleTranslation = () => {
  const before = actualScrollTop
  emit('toggleTranslation')
  void nextTick().then(() => {
    scrollTop.value = before
  })
}

watch(
  () => `${props.reading.content_id}:${props.reading.content_version}`,
  async () => {
    actualScrollTop = 0
    scrollTop.value = 0
    await nextTick()
    if (disposed) return
    restorePosition(props.initialPosition)
    sourceHighlight.value = props.sourceParagraphId
    if (highlightTimer) globalThis.clearTimeout(highlightTimer)
    if (sourceHighlight.value)
      highlightTimer = globalThis.setTimeout(() => {
        sourceHighlight.value = undefined
      }, 2500)
  },
  { immediate: true }
)
onBeforeUnmount(() => {
  disposed = true
  if (scrollTimer) globalThis.clearTimeout(scrollTimer)
  if (highlightTimer) globalThis.clearTimeout(highlightTimer)
})
</script>

<template>
  <scroll-view class="reading-scroll" scroll-y :scroll-top="scrollTop" @scroll="handleScroll">
    <view class="reading-card">
      <view class="reading-heading">
        <text class="reading-title">{{ reading.title_en }}</text>
        <text class="reading-chinese-title">{{ reading.title_zh }}</text>
        <view class="reading-tags">
          <button
            class="reading-tag category-tag"
            :class="{ selected: categorySelected }"
            :aria-pressed="categorySelected"
            @click="emit('toggleTag', 'category')"
          >
            {{ reading.category }}
          </button>
          <button
            class="reading-tag level-tag"
            :class="{ selected: levelSelected }"
            :aria-pressed="levelSelected"
            @click="emit('toggleTag', 'level')"
          >
            {{ reading.topic }} · {{ reading.level }}
          </button>
        </view>
      </view>
      <button
        v-if="reading.whole_audio"
        class="whole-audio"
        :disabled="audioStatus === AudioStatus.LOADING"
        @click="emit('play')"
      >
        <view
          class="audio-symbol"
          :class="{
            pause: audioStatus === AudioStatus.PLAYING,
            loading: audioStatus === AudioStatus.LOADING
          }"
          ><view v-if="audioStatus === AudioStatus.PLAYING" class="pause-bars" /><text
            v-else-if="audioStatus === AudioStatus.LOADING"
            >…</text
          ><view v-else class="play-triangle"
        /></view>
        <view class="audio-copy"
          ><text class="audio-title">{{ audioLabel }}</text
          ><text class="audio-hint">播放完整短文</text></view
        >
        <text v-if="reading.whole_audio.duration_ms" class="audio-duration">{{ duration }}</text>
      </button>
      <view class="reading-toolbar"
        ><text>英文正文</text
        ><button class="translation-toggle" @click="toggleTranslation">
          {{ translationVisible ? '收起全文译文' : '显示全文译文' }}
        </button></view
      >
      <view
        v-for="paragraph in reading.paragraphs_en"
        :key="paragraph.paragraph_id"
        class="short-reading-paragraph"
        :class="{ 'source-highlight': sourceHighlight === paragraph.paragraph_id }"
        ><text>{{ paragraph.text }}</text></view
      >
      <button class="tablet-translation" @click="toggleTranslation">
        {{ translationVisible ? '收起全文译文' : '显示全文译文' }}
      </button>
      <view v-if="translationVisible" class="full-translation"
        ><text class="translation-heading">全文译文</text
        ><text class="translation-content">{{ reading.translation_zh }}</text></view
      >
      <text v-if="errorMessage" class="reading-error" role="status">{{ errorMessage }}</text>
      <button
        class="complete-button"
        :disabled="completing || Boolean(reading.progress.completed_at)"
        @click="emit('complete')"
      >
        {{ reading.progress.completed_at ? '已读完' : completing ? '正在提交…' : '标记读完' }}
      </button>
    </view>
  </scroll-view>
</template>

<style scoped lang="scss">
.reading-scroll {
  height: var(--reading-scroll-height, calc(100vh - 172px));
  overflow-x: hidden;
}

.reading-card {
  display: flex;
  min-width: 0;
  padding: 20px;
  color: #254733;
  flex-direction: column;
  gap: 14px;

  text {
    display: block;
    overflow-wrap: anywhere;
  }

  button {
    margin: 0;
    border: 0;

    &::after {
      border: 0;
    }
  }

  .reading-heading {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .reading-title {
    font-size: 26px;
    font-weight: 700;
    line-height: 36px;
  }

  .reading-chinese-title {
    color: #748271;
    font-size: 14px;
    line-height: 22px;
  }

  .reading-tags {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .reading-tag {
    min-width: 76px;
    min-height: 24px;
    padding: 3px 14px;
    border-radius: 10px;
    background: #fff;
    color: #4e7f3b;
    font-size: 11px;
    line-height: 18px;
    overflow-wrap: anywhere;

    &.category-tag {
      min-width: 88px;
    }

    &.selected {
      background: #4e7f3b;
      color: #fff;
    }
  }

  .whole-audio {
    display: flex;
    width: 100%;
    min-height: 64px;
    align-items: center;
    padding: 8px 20px 8px 13px;
    border: 1px solid #d6dfc9;
    border-radius: 14px;
    background: #fffdf7;
    color: #254733;
    gap: 10px;
    text-align: left;

    .audio-symbol {
      display: flex;
      width: 36px;
      height: 36px;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: #4e7f3b;
      color: #fff;
    }

    .play-triangle {
      width: 0;
      height: 0;
      margin-left: 2px;
      border-top: 7px solid transparent;
      border-bottom: 7px solid transparent;
      border-left: 10px solid #fff;
    }

    .pause-bars {
      width: 12px;
      height: 15px;
      border-right: 4px solid #fff;
      border-left: 4px solid #fff;
    }

    .audio-copy {
      min-width: 0;
      flex: 1;
    }

    .audio-title {
      font-size: 14px;
      font-weight: 700;
      line-height: 25px;
    }

    .audio-hint {
      color: #748574;
      font-size: 11px;
      line-height: 18px;
    }

    .audio-duration {
      color: #5c715e;
      font-size: 12px;
      line-height: 22px;
    }
  }

  .reading-toolbar {
    display: flex;
    min-height: 44px;
    align-items: center;
    justify-content: space-between;
    gap: 12px;

    > text {
      font-size: 13px;
      font-weight: 700;
      line-height: 22px;
    }

    .translation-toggle {
      min-height: 44px;
      padding: 11px 20px;
      border-radius: 12px;
      background: transparent;
      color: #4f7e38;
      font-size: 14px;
      line-height: 22px;
    }
  }

  .short-reading-paragraph {
    font-size: 14px;
    line-height: 22px;
    white-space: pre-wrap;

    &.source-highlight {
      border-radius: 8px;
      background: #e2eed9;
    }
  }

  .full-translation {
    display: flex;
    padding: 16px;
    border: 1px solid #d9e4d2;
    border-radius: 14px;
    background: #fffdf7;
    flex-direction: column;
    gap: 12px;

    .translation-heading {
      font-size: 18px;
      font-weight: 700;
      line-height: 29px;
    }

    .translation-content {
      font-size: 14px;
      line-height: 22px;
      white-space: pre-wrap;
    }
  }

  .tablet-translation {
    display: none;
  }

  .complete-button {
    width: 100%;
    min-height: 46px;
    padding: 12px;
    border-radius: 12px;
    background: #4e7f3b;
    color: #fff;
    font-size: 15px;
    line-height: 22px;
  }

  .reading-error {
    color: #bd5f59;
    font-size: 14px;
    line-height: 22px;
  }

  @media (width >= 700px) {
    max-width: 592px;
    margin: 12px auto 24px;
    padding: 24px;
    border: 1px solid #d9e4d2;
    border-radius: 14px;
    background: #fffdf7;
    gap: 16px;

    .reading-heading {
      gap: 16px;
    }

    .reading-title {
      font-size: 18px;
      line-height: 29px;
    }

    .reading-chinese-title {
      display: none;
    }

    .reading-tags {
      gap: 12px;
    }

    .reading-tag {
      min-width: 128px;
      min-height: 28px;
      padding: 5px 14px;

      &.category-tag {
        min-width: 118px;
      }
    }

    .reading-toolbar {
      display: none;
    }

    .whole-audio {
      display: none;
    }

    .short-reading-paragraph {
      font-size: 18px;
      font-weight: 500;
      line-height: 27px;
    }

    .tablet-translation {
      display: block;
      width: 100%;
      min-height: 44px;
      padding: 11px;
      border-radius: 12px;
      background: #e2eed9;
      color: #254733;
      font-size: 15px;
      line-height: 22px;
    }
  }
}
</style>
