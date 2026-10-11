<script setup lang="ts">
import { onHide, onLoad, onPageScroll, onShow, onUnload } from '@dcloudio/uni-app'
import { computed, nextTick, ref, watch } from 'vue'

import AppState from '@/components/app-state/app-state.vue'
import AudioButton from '@/features/audio/components/audio-button.vue'
import SceneHeading from '@/features/scene/components/scene-heading.vue'
import ScenePageLayout from '@/features/scene/components/scene-page-layout.vue'
import SceneReadingView from '@/features/scene/components/scene-reading-view.vue'
import { useScenePage } from '@/features/scene/use-scene-page'
import { AUDIO_PLAYBACK_STATUSES } from '@/shared/constants/audio'
import { AudioButtonVariant, AudioStatus } from '@/shared/enums/audio'
import { NavigationType } from '@/shared/enums/navigation'
import { decodePageQuery } from '@/shared/navigation/decode-page-query'
import { navigate } from '@/shared/navigation/navigate'
import { useSessionStore } from '@/stores/session'

import type { SceneEntry } from '@/shared/contracts/learning'

const {
  audio,
  disposeAudio,
  favorite,
  fullModel,
  initialize,
  pendingFavoriteIds,
  play,
  savePosition,
  scene,
  sceneId,
  scrollTop
} = useScenePage()
const highlightedId = ref('')
/** 从当前句时间播放整段文件，entry为同版已确认时间条目 */
const playSentence = (entry: SceneEntry) => {
  const whole = fullModel.value?.audio
  const timing = entry.audio_timing
  if (
    !whole ||
    !timing ||
    timing.target_id !== whole.target_id ||
    timing.version_id !== whole.version_id
  )
    return
  void play({ ...whole, sentence_id: entry.entry_id, start_ms: timing.start_ms })
}
/** 按同版整段时间激活当前句，暂停及句间停顿保留位置 */
const currentSentence = computed(() => {
  const snapshot = audio.snapshot
  const whole = fullModel.value?.audio
  if (
    !whole ||
    !snapshot.target ||
    !AUDIO_PLAYBACK_STATUSES.includes(snapshot.status) ||
    snapshot.target.target_id !== whole.target_id ||
    snapshot.target.version_id !== whole.version_id
  )
    return highlightedId.value
  let current = scene.dialogueEntries[0]?.entry_id ?? ''
  let latest = -1
  for (const entry of scene.dialogueEntries) {
    const timing = entry.audio_timing
    if (
      timing &&
      timing.version_id === whole.version_id &&
      timing.start_ms <= (snapshot.currentTimeMs ?? 0) &&
      timing.start_ms > latest
    ) {
      current = entry.entry_id
      latest = timing.start_ms
    }
  }
  return current
})
let highlightTimer: ReturnType<typeof globalThis.setTimeout> | undefined
let pageActive = false
let pageGeneration = 0
watch(
  () => audio.snapshot.status,
  (status) => {
    const whole = fullModel.value?.audio
    const target = audio.snapshot.target
    if (
      pageActive &&
      status === AudioStatus.FAILED &&
      whole &&
      target?.target_id === whole.target_id &&
      target.version_id === whole.version_id
    ) {
      void navigate({
        type: NavigationType.NAVIGATE_TO,
        url: `/sub-packages/scene/audio-failed?sceneId=${encodeURIComponent(sceneId.value)}`
      })
    }
  }
)
const duration = computed(() => {
  const seconds = Math.round((fullModel.value?.audio?.duration_ms ?? 0) / 1000)
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
})
/** 读取当前场景并只对当前版本唯一句子恢复来源，query为路由参数 */
const load = async (query?: Record<string, string>) => {
  pageActive = true
  const request = ++pageGeneration
  await initialize(query?.sceneId)
  if (!pageActive || request !== pageGeneration) return
  const locator = decodePageQuery(query?.sourceLocator)
  const stored = uni.getStorageSync(`juya.scene-position.${sceneId.value}`) as
    { entry_id?: string; offset?: number } | undefined
  const currentVersion = fullModel.value?.content_version
  const requestedVersion = query?.contentVersion ? Number(query.contentVersion) : undefined
  const versionMatches = requestedVersion === undefined || requestedVersion === currentVersion
  const savedVersion = (stored as { content_version?: number } | undefined)?.content_version
  const sourceId =
    versionMatches && locator
      ? locator
      : !query?.contentVersion && savedVersion === currentVersion
        ? stored?.entry_id
        : undefined
  const entry = scene.dialogueEntries.find(
    (row) =>
      row.source_locator === sourceId || sourceId?.startsWith(`sentence:${row.entry_id}:entry:`)
  )
  if (!entry || !pageActive) return
  await nextTick()
  if (!pageActive || request !== pageGeneration) return
  if (locator && versionMatches) {
    highlightedId.value = entry.entry_id
    uni.pageScrollTo({ selector: `#sentence-${entry.entry_id}`, duration: 0 })
    highlightTimer = globalThis.setTimeout(() => {
      highlightedId.value = ''
    }, 2200)
  } else if (Number.isFinite(stored?.offset))
    uni.pageScrollTo({ scrollTop: Math.max(0, stored!.offset!), duration: 0 })
}
/** 切全文译文后恢复现有像素位置，不改变收藏和播放 */
const toggleTranslation = async () => {
  const request = pageGeneration
  const top = scrollTop.value
  scene.toggleChinese()
  await nextTick()
  if (!pageActive || request !== pageGeneration) return
  uni.pageScrollTo({ scrollTop: top, duration: 0 })
}
/** 保存当前页面稳定句子和真实滚动，event为页面滚动位置 */
const scroll = (event: { scrollTop: number }) => {
  const request = pageGeneration
  scrollTop.value = event.scrollTop
  const selector = uni.createSelectorQuery()
  selector.selectAll('.sentence-row').boundingClientRect()
  selector.exec((results) => {
    if (!pageActive || request !== pageGeneration) return
    const rows = results[0] as { bottom: number }[] | undefined
    const entry = scene.dialogueEntries[rows?.findIndex((row) => row.bottom > 78) ?? -1]
    if (entry) savePosition({ entry_id: entry.source_locator, offset: event.scrollTop })
  })
}
/** 跳转逐句跟读，保留当前稳定内容身份 */
const shadow = () =>
  navigate({
    type: NavigationType.NAVIGATE_TO,
    url: `/sub-packages/scene/shadowing?sceneId=${encodeURIComponent(sceneId.value)}`
  })
/** 转发当前卡收藏，entry为确认条目 */
const toggleFavorite = (entry: SceneEntry) => {
  void favorite(entry)
}
/** 离页停止受限原音和迟到定位 */
const cleanup = () => {
  pageActive = false
  pageGeneration++
  highlightedId.value = ''
  if (highlightTimer) globalThis.clearTimeout(highlightTimer)
  highlightTimer = undefined
  disposeAudio()
}
onLoad(load)
watch(() => useSessionStore().cleanupGeneration, cleanup, { flush: 'sync' })
onShow(() => {
  pageActive = true
})
onPageScroll(scroll)
onHide(cleanup)
onUnload(cleanup)
</script>
<template>
  <ScenePageLayout :title="fullModel?.chineseTitle.replace(/^在/, '') || '场景阅读'">
    <view v-if="fullModel" class="scene-reading-page">
      <SceneHeading
        :chinese-title="fullModel.chineseTitle"
        :title="fullModel.title"
        :series="fullModel.series"
      />
      <view v-if="fullModel.audio" class="whole-player">
        <AudioButton
          :variant="AudioButtonVariant.LARGE"
          :current-key="audio.currentKey"
          :status="audio.snapshot.status"
          :target="fullModel.audio"
          @play="play"
        />
        <text class="whole-label" @click="play(fullModel.audio)">播放完整场景对话</text
        ><text class="whole-duration">{{ duration }}</text>
      </view>
      <SceneReadingView
        :entries="scene.dialogueEntries"
        :words="scene.vocabularyEntries"
        :chunks="scene.phraseEntries"
        :content-version="fullModel.content_version"
        :chinese-visible="scene.viewState.chineseVisible"
        :highlighted-id="currentSentence"
        :pending-ids="pendingFavoriteIds"
        @toggle-translation="toggleTranslation"
        @favorite="toggleFavorite"
        @play-sentence="playSentence"
      />
      <view v-if="scene.dialogueEntries.length" class="fixed-action"
        ><button @click="shadow">进入逐句跟读 ›</button></view
      >
    </view>
    <text v-else-if="scene.loading">正在加载场景…</text>
    <AppState
      v-else
      title="暂时无法打开场景"
      icon-label="场景不可用"
      description="请返回学习页重新确认访问权限。"
    />
  </ScenePageLayout>
</template>
<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.scene-reading-page {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding-bottom: 84px;

  .whole-player {
    display: flex;
    min-height: 64px;
    align-items: center;
    margin-top: 22px;
    padding: 8px 13px;
    border: 1px solid #d9e4d2;
    border-radius: 14px;
    background: #fffdf7;
    gap: 10px;
  }

  .whole-label {
    flex: 1;
    color: #254733;
    font-size: 14px;
    font-weight: 700;
    line-height: 22px;
  }

  .whole-duration {
    color: #5c715e;
    font-size: 12px;
  }

  .fixed-action {
    position: fixed;
    z-index: 25;
    right: 0;
    bottom: calc(max(76px, 19.487vw) + env(safe-area-inset-bottom) + var(--safe-bottom-extra, 0px));
    left: 0;
    max-width: 760px;
    margin: 0 auto;
    padding: 12px 20px;
    background: #f7f1e3;

    button {
      width: 100%;
      min-height: 48px;
      margin: 0;
      border-radius: 12px;
      background: #4e7f3b;
      color: #fff;
      font-size: 15px;
      line-height: 48px;
    }
  }
}

@media (width >= 700px) {
  .scene-reading-page .fixed-action {
    bottom: calc(
      max(76px, tokens.home-size(76)) + env(safe-area-inset-bottom) + var(--safe-bottom-extra, 0px)
    );
  }
}
</style>
