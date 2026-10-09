<script setup lang="ts">
import { onHide, onLoad, onPageScroll, onUnload } from '@dcloudio/uni-app'
import { computed } from 'vue'

import AppState from '@/components/app-state/app-state.vue'
import EntryList from '@/features/scene/components/entry-list.vue'
import ScenePageLayout from '@/features/scene/components/scene-page-layout.vue'
import { useScenePage } from '@/features/scene/use-scene-page'
import VocabularySheet from '@/features/vocabulary-sheet/components/vocabulary-sheet.vue'
import { SceneLookupEntryType } from '@/shared/enums/learning'
import { NavigationType } from '@/shared/enums/navigation'
import { navigate } from '@/shared/navigation/navigate'

import type { EntryPageViewProps } from '@/shared/types/scene-components'
import type { ScrollOffset } from '@/shared/types/ui'

const props = defineProps<EntryPageViewProps>()
const {
  audio,
  closeSheet,
  complete,
  disposeAudio,
  favorite,
  fullModel,
  initialize,
  inspectEntry,
  play,
  scene,
  sceneId,
  scrollTop
} = useScenePage()
const phrase = computed(() => props.entryType === SceneLookupEntryType.PHRASE)
const entries = computed(() => (phrase.value ? scene.phraseEntries : scene.vocabularyEntries))
const sourceChinese = computed(() =>
  scene.dialogueEntries
    .filter((entry) => scene.sheet?.snapshot.entry.source_sentence_ids?.includes(entry.entry_id))
    .map((entry) => entry.chinese)
    .filter(Boolean)
    .join('\n')
)

/** 加载场景，query 为页面路由参数 */
const handleLoad = (query?: Record<string, string>) => {
  void initialize(query?.sceneId)
}
/** 记录真实页面滚动，event 为当前位置 */
const handleScroll = (event: ScrollOffset) => {
  scrollTop.value = event.scrollTop
}
/** 词汇页进入语块，语块页完成后进入成果 */
const next = async () => {
  if (phrase.value) {
    if (await complete())
      await navigate({
        type: NavigationType.REDIRECT_TO,
        url: `/sub-packages/scene/completed?sceneId=${encodeURIComponent(sceneId.value)}`
      })
  } else
    await navigate({
      type: NavigationType.NAVIGATE_TO,
      url: `/sub-packages/scene/chunks?sceneId=${encodeURIComponent(sceneId.value)}`
    })
}

onLoad(handleLoad)
onPageScroll(handleScroll)
onHide(disposeAudio)
onUnload(disposeAudio)
</script>
<template>
  <ScenePageLayout :title="fullModel?.chineseTitle.replace(/^在/, '') ?? title">
    <template v-if="fullModel">
      <text class="scene-title">{{ title }}</text
      ><text class="scene-subtitle"
        >{{ fullModel.chineseTitle }} ·
        {{ phrase ? '完整语块更容易开口用' : '点击已收录词汇查看释义' }}</text
      >
      <view class="scene-highlight"
        ><text class="highlight-label">{{ phrase ? '学习提示' : '学习方式' }}</text
        ><text class="highlight-value">{{ phrase ? '整句记忆' : '点词查阅' }}</text
        ><text class="highlight-hint">{{
          phrase ? '点击已收录语块，查看含义与来源句。' : '词卡从当前页底部打开，阅读位置不变。'
        }}</text></view
      >
      <view class="scene-section">{{ phrase ? '常用语块' : '本场景词汇' }}</view>
      <EntryList
        v-if="entries.length"
        :current-audio-key="audio.currentKey"
        :entries="entries"
        :sentences="scene.dialogueEntries"
        :status="audio.snapshot.status"
        @inspect="inspectEntry"
        @play="play"
      />
      <text v-else class="scene-loading">这个场景暂时没有可展示的条目</text>
      <view class="scene-actions"
        ><button class="scene-action" @click="next">
          {{ phrase ? '完成本次学习' : '查看 Useful Chunks' }}
        </button></view
      >
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

.scene-subtitle {
  min-height: 43px;
}

.scene-section {
  margin-top: 10px;
  margin-bottom: 5px;
}
</style>
