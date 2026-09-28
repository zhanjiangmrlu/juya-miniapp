<script setup lang="ts">
import { onHide, onLoad } from '@dcloudio/uni-app'
import { computed } from 'vue'

import AppPage from '@/components/app-page/app-page.vue'
import AppState from '@/components/app-state/app-state.vue'
import PageHeader from '@/components/page-header/page-header.vue'
import EntryList from '@/features/scene/components/entry-list.vue'
import { useScenePage } from '@/features/scene/use-scene-page'
import VocabularySheet from '@/features/vocabulary-sheet/components/vocabulary-sheet.vue'

const props = defineProps<{
  entryType: 'PHRASE' | 'VOCABULARY'
  title: string
}>()

const { audio, closeSheet, disposeAudio, favorite, initialize, inspectEntry, play, scene } =
  useScenePage()
const entries = computed(() =>
  props.entryType === 'PHRASE' ? scene.phraseEntries : scene.vocabularyEntries
)

/** 读取场景标识并加载对应词汇或语块列表。 */
function handleLoad(query?: Record<string, string>) {
  void initialize(query?.sceneId)
}

onLoad(handleLoad)
onHide(disposeAudio)
</script>

<template>
  <AppPage>
    <PageHeader eyebrow="场景学习" :title="title" />
    <EntryList
      v-if="entries.length > 0"
      :current-audio-key="audio.currentKey"
      :entries="entries"
      :status="audio.snapshot.status"
      @inspect="inspectEntry"
      @play="play"
    />
    <AppState
      v-else
      description="这个场景暂时没有可展示的条目。"
      icon-label="暂无内容"
      title="内容准备中"
    />
    <VocabularySheet
      v-if="scene.sheet?.snapshot.open"
      :current-audio-key="audio.currentKey"
      :entry="scene.sheet.snapshot.entry"
      :status="audio.snapshot.status"
      @close="closeSheet"
      @favorite="favorite"
      @play="play"
    />
  </AppPage>
</template>
