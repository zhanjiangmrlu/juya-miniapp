<script setup lang="ts">
import { onHide, onLoad, onPageScroll, onShow, onUnload } from '@dcloudio/uni-app'
import { computed, getCurrentInstance, ref, watch } from 'vue'

import AppState from '@/components/app-state/app-state.vue'
import { isSameAudioTarget } from '@/features/audio/audio-machine'
import AudioButton from '@/features/audio/components/audio-button.vue'
import DialogueList from '@/features/scene/components/dialogue-list.vue'
import SceneHeading from '@/features/scene/components/scene-heading.vue'
import ScenePageLayout from '@/features/scene/components/scene-page-layout.vue'
import { useScenePage } from '@/features/scene/use-scene-page'
import VocabularySheet from '@/features/vocabulary-sheet/components/vocabulary-sheet.vue'
import { navigate } from '@/shared/navigation/navigate'
import { usePageScrollLock } from '@/shared/use-page-scroll-lock'

const {
  audio,
  closeSheet,
  disposeAudio,
  favorite,
  fullModel,
  initialize,
  inspectSentence,
  play,
  savePosition,
  scene,
  sceneId,
  scrollTarget,
  scrollTop,
  sheetLoading
} = useScenePage()
const restoredId = ref('')
const pageActive = ref(true)
const pageInstance = getCurrentInstance()
const listScrollTop = ref(0)
let highlightTimer: ReturnType<typeof globalThis.setTimeout> | undefined
/** 按设备位置定位当前句，暂停和句间停顿保留激活，下一句开始时切换 */
const currentSentence = computed(() => {
  const snapshot = audio.snapshot
  if (snapshot.target?.sentence_id && ['PLAYING', 'PAUSED'].includes(snapshot.status))
    return snapshot.target.sentence_id
  if (
    snapshot.target &&
    fullModel.value?.audio &&
    isSameAudioTarget(snapshot.target, fullModel.value.audio) &&
    ['PLAYING', 'PAUSED'].includes(snapshot.status)
  ) {
    let activeId = scene.dialogueEntries[0]?.entry_id
    let activeStartMs = -1
    for (const entry of scene.dialogueEntries) {
      const timing = entry.audio_timing ?? entry.audio
      if (
        timing?.target_id === snapshot.target.target_id &&
        timing.version_id === snapshot.target.version_id &&
        timing.start_ms !== undefined &&
        timing.start_ms <= (snapshot.currentTimeMs ?? 0) &&
        timing.start_ms > activeStartMs
      ) {
        activeId = entry.entry_id
        activeStartMs = timing.start_ms
      }
    }
    return activeId
  }
  return restoredId.value || scene.dialogueEntries[0]?.entry_id
})
const duration = computed(() => {
  const seconds = Math.round((fullModel.value?.audio?.duration_ms ?? 0) / 1000)
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
})
const wholePlaying = computed(
  () =>
    audio.snapshot.status === 'PLAYING' &&
    audio.snapshot.target &&
    !audio.snapshot.target.sentence_id
)
const sourceChinese = computed(() =>
  scene.dialogueEntries
    .filter((entry) => scene.sheet?.snapshot.entry.source_sentence_ids?.includes(entry.entry_id))
    .map((entry) => entry.chinese)
    .filter(Boolean)
    .join('\n')
)

/** 加载场景并恢复稳定来源，query 为场景和来源定位参数 */
const handleLoad = async (query?: Record<string, string>) => {
  await initialize(query?.sceneId)
  if (query?.sourceLocator) {
    const entry = scene.dialogueEntries.find(
      (candidate) =>
        candidate.source_locator === query.sourceLocator ||
        query.sourceLocator?.includes(`sentence:${candidate.entry_id}:`)
    )
    if (entry) {
      scrollTarget.value = entry.source_locator
      restoredId.value = entry.entry_id
      highlightTimer = globalThis.setTimeout(() => {
        restoredId.value = ''
        scrollTarget.value = ''
      }, 2200)
    }
  }
}
/** 记录真实页面滚动，event 为页面实际滚动位置 */
const handleScroll = (event: { scrollTop: number }) => {
  scrollTop.value = event.scrollTop
  const row = scene.dialogueEntries.find((entry) => entry.entry_id === currentSentence.value)
  if (row) savePosition({ entry_id: row.source_locator, offset: event.scrollTop })
}
/** 保存列表真实首个可见句，event 为内部滚动事件，使用实际测量避免译文高度误差 */
const handleListScroll = (event: { detail: { scrollTop: number } }) => {
  listScrollTop.value = event.detail.scrollTop
  const query = uni.createSelectorQuery().in(pageInstance?.proxy)
  query.select('.dialogue-scroll').boundingClientRect()
  query.selectAll('.dialogue-sentence').boundingClientRect()
  query.exec((measurements) => {
    const viewport = measurements[0] as { top: number } | undefined
    const rows = measurements[1] as { bottom: number }[] | undefined
    if (!viewport || !rows) return
    const index = rows.findIndex((row) => row.bottom > viewport.top)
    const entry = scene.dialogueEntries[index]
    if (entry) {
      scrollTop.value = event.detail.scrollTop
      savePosition({ entry_id: entry.source_locator, offset: event.detail.scrollTop })
    }
  })
}
/** 进入逐句跟读并保留场景标识 */
const openShadowing = async () => {
  await navigate({
    type: 'navigateTo',
    url: `/sub-packages/scene/shadowing?sceneId=${encodeURIComponent(sceneId.value)}`
  })
}
/** 离开页面取消定位高亮和媒体资源 */
const cleanup = () => {
  pageActive.value = false
  if (highlightTimer) globalThis.clearTimeout(highlightTimer)
  disposeAudio()
}

/** 设备音频失败时进入可继续阅读的降级页，保留失败句稳定标识 */
watch(
  () => audio.snapshot.status,
  (status) => {
    if (status !== 'FAILED' || !fullModel.value || !pageActive.value) return
    const sentenceId = audio.snapshot.target?.sentence_id
    void navigate({
      type: 'redirectTo',
      url: `/sub-packages/scene/audio-failed?sceneId=${encodeURIComponent(sceneId.value)}${sentenceId ? '&sentenceId=' + encodeURIComponent(sentenceId) : ''}`
    })
  }
)

onLoad(handleLoad)
onShow(() => {
  pageActive.value = true
})
onPageScroll(handleScroll)
onHide(cleanup)
onUnload(cleanup)
const { pageStyle, scrollLocked } = usePageScrollLock()
</script>
<template>
  <!-- #ifdef MP-WEIXIN -->
  <page-meta :page-style="pageStyle" />
  <!-- #endif -->
  <ScenePageLayout :title="fullModel?.chineseTitle.replace(/^在/, '') ?? '场景对话'">
    <template v-if="fullModel">
      <SceneHeading
        :chinese-title="fullModel.chineseTitle"
        :title="fullModel.title"
        :series="fullModel.series"
      />
      <view v-if="fullModel.audio" class="whole-player">
        <AudioButton
          variant="large"
          :current-key="audio.currentKey"
          label="整段播放"
          :status="audio.snapshot.status"
          :target="fullModel.audio"
          @play="play"
        />
        <view class="whole-copy"
          ><text>{{ wholePlaying ? '整段播放中' : '整段播放' }}</text
          ><text class="whole-hint">播放完整场景对话</text></view
        ><text class="whole-duration">{{ duration }}</text>
      </view>
      <button
        class="language-toggle"
        role="switch"
        :aria-checked="scene.viewState.chineseVisible"
        @click="scene.toggleChinese"
      >
        <text>显示中文</text><text class="language-hint">进入场景默认隐藏</text
        ><view class="language-track" :class="{ enabled: scene.viewState.chineseVisible }"
          ><view class="language-thumb"
        /></view>
      </button>
      <view class="scene-section dialogue-section"
        ><text>场景对话</text
        ><text class="section-meta">共 {{ scene.dialogueEntries.length }} 句 · 可滚动</text></view
      >
      <scroll-view
        class="dialogue-scroll"
        :scroll-y="!scrollLocked"
        :scroll-into-view="scrollTarget"
        :scroll-top="listScrollTop"
        @scroll="handleListScroll"
      >
        <DialogueList
          :chinese-visible="scene.viewState.chineseVisible"
          :current-audio-key="audio.currentKey"
          :entries="scene.dialogueEntries"
          :catalog="fullModel.entries"
          :status="audio.snapshot.status"
          :highlighted-id="currentSentence"
          :audio-selection-visible="!wholePlaying"
          @inspect="inspectSentence"
          @play="play"
        />
      </scroll-view>
      <view v-if="audio.snapshot.status === 'FAILED'" class="audio-failure" role="alert"
        ><text>音频加载失败，正文可继续阅读</text
        ><button @click="audio.snapshot.target && play(audio.snapshot.target)">
          重新加载音频
        </button></view
      >
      <view class="scene-actions"
        ><button class="scene-action" @click="openShadowing">进入逐句跟读 ›</button></view
      >
      <text v-if="sheetLoading" class="sheet-loading" role="status">正在加载词卡…</text>
      <VocabularySheet
        v-if="scene.sheet?.snapshot.open"
        :current-audio-key="audio.currentKey"
        :entry="scene.sheet.snapshot.entry"
        :scene-title="fullModel.chineseTitle"
        :source-chinese="sourceChinese"
        :status="audio.snapshot.status"
        @close="closeSheet"
        @favorite="favorite"
        @play="play"
      />
    </template>
    <text v-else-if="scene.loading" class="scene-loading">正在加载场景…</text>
    <AppState
      v-else
      description="请返回学习页重新确认访问权限。"
      icon-label="场景不可用"
      title="暂时无法打开场景"
    />
  </ScenePageLayout>
</template>
<style scoped lang="scss">
@use '@/features/scene/scene-page.scss' as scene;
@include scene.page;

.whole-player {
  display: flex;
  min-height: 64px;
  align-items: center;
  margin-top: 12px;
  padding: 8px 13px;
  border: 1px solid #d6dfc9;
  border-radius: 14px;
  background: #fffdf7;
  gap: 10px;

  .whole-copy {
    flex: 1;
    min-width: 0;

    text {
      display: block;
      font-size: 14px;
      font-weight: 700;
      line-height: 25px;
    }

    .whole-hint {
      color: #748574;
      font-size: 11px;
      font-weight: 400;
      line-height: 18px;
    }
  }

  .whole-duration {
    color: #5c715e;
    font-size: 12px;
  }
}

.language-toggle {
  display: flex;
  width: 100%;
  min-height: 42px;
  align-items: center;
  margin: 12px 0 0;
  padding: 8px 13px;
  border: 1px solid #d6dfc9;
  border-radius: 12px;
  background: #fffdf7;
  color: #254733;
  font-size: 13px;
  line-height: 24px;
  text-align: left;

  .language-hint {
    flex: 1;
    margin-left: 32px;
    color: #7b8a7b;
    font-size: 11px;
  }

  .language-track {
    width: 38px;
    height: 20px;
    flex: none;
    padding: 2px;
    border-radius: 10px;
    background: #d9e2d3;

    .language-thumb {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #fffdf7;
      margin-left: var(--thumb-offset, 0);
    }

    &.enabled {
      background: #4e7f3b;

      --thumb-offset: 18px;
    }
  }
}

.dialogue-section {
  margin-top: 12px;
  margin-bottom: 10px;
  font-size: 18px;
  line-height: 29px;
}

.dialogue-scroll {
  flex: none;
  height: min(
    325px,
    calc(100vh - 519px - var(--navigation-offset, 0px) - var(--safe-bottom-extra, 0px))
  );
}

.scene-actions {
  padding-top: 13px;
}

.audio-failure {
  margin-top: 12px;
  padding: 12px;
  border-radius: 12px;
  background: #fbeee7;
  color: #bc4d31;
  font-size: 12px;

  button {
    margin: 8px 0 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: #4e7f3b;
    font-size: 13px;
  }
}

.sheet-loading {
  position: fixed;
  z-index: 65;
  top: 45%;
  left: 50%;
  padding: 12px 16px;
  border-radius: 12px;
  background: #fffdf7;
  color: #254733;
  font-size: 13px;
  transform: translateX(-50%);
}
</style>
