<script setup lang="ts">
import { onHide, onLoad, onUnload } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

import AppState from '@/components/app-state/app-state.vue'
import ScenePageLayout from '@/features/scene/components/scene-page-layout.vue'
import { useScenePage } from '@/features/scene/use-scene-page'
import { getRuntimeServices } from '@/services/runtime'
import { navigate } from '@/shared/navigation/navigate'

import type { SceneEntry } from '@/shared/contracts/learning'

const props = withDefaults(defineProps<{ source?: boolean }>(), { source: false })
const { audio, disposeAudio, fullModel, handleFailure, initialize, play, scene, sceneId } =
  useScenePage()
const locator = ref('')
const sourceEntry = ref<SceneEntry>()
const sourceLoading = ref(props.source)
const selectedSentence = computed(
  () =>
    scene.dialogueEntries.find(
      (entry) =>
        entry.source_locator === locator.value ||
        locator.value.includes(`sentence:${entry.entry_id}:`)
    ) ?? scene.dialogueEntries[0]
)
const index = computed(() =>
  Math.max(
    1,
    scene.dialogueEntries.findIndex(
      (entry) => entry.entry_id === selectedSentence.value?.entry_id
    ) + 1
  )
)

/** 保存路由来源并加载授权场景，query 为稳定场景、句子和词条参数 */
const handleLoad = async (query?: Record<string, string>) => {
  locator.value = query?.sourceLocator ?? ''
  await initialize(query?.sceneId)
  sourceLoading.value = false
  if (!locator.value && !props.source) {
    const saved = uni.getStorageSync(`juya.scene-position.${sceneId.value}`)
    if (saved && typeof saved.entry_id === 'string') locator.value = saved.entry_id
  }
  const model = fullModel.value
  const id = query?.entryId
  if (props.source && model?.revision_id && id) {
    const entry = model.entries.find((candidate) => candidate.entry_id === id)
    if (!entry) return
    sourceLoading.value = true
    try {
      const published = await getRuntimeServices().scene.getEntry(model.sceneId, id, {
        revision_id: query?.revisionId ?? model.revision_id,
        entry_version: Number(query?.entryVersion) || entry.entry_version || 1,
        source_locator: locator.value
      })
      if (fullModel.value !== model) return
      sourceEntry.value = {
        ...entry,
        ...published,
        entry_type: entry.entry_type,
        text: published.english,
        source_sentence_ids: [...published.source_sentence_ids]
      }
    } catch (error) {
      handleFailure(error)
    } finally {
      sourceLoading.value = false
    }
  }
}
/** 继续阅读来源句，使用稳定标识而非排序号 */
const continueReading = async () => {
  const sourceLocator = selectedSentence.value?.source_locator ?? ''
  await navigate({
    type: 'redirectTo',
    url: `/sub-packages/scene/dialogue?sceneId=${encodeURIComponent(sceneId.value)}&sourceLocator=${encodeURIComponent(sourceLocator)}`
  })
}
/** 播放定位句原音，继续沿用当前发布整段音频 */
const playCurrent = async () => {
  if (selectedSentence.value?.audio) await play(selectedSentence.value.audio)
}
/** 进入重点词汇并保留场景 */
const vocabulary = async () => {
  await navigate({
    type: 'navigateTo',
    url: `/sub-packages/scene/vocabulary?sceneId=${encodeURIComponent(sceneId.value)}`
  })
}
onLoad(handleLoad)
onHide(disposeAudio)
onUnload(disposeAudio)
</script>
<template>
  <ScenePageLayout :title="fullModel?.chineseTitle.replace(/^在/, '') ?? '场景学习'">
    <template v-if="fullModel && (!source || sourceEntry)">
      <text class="scene-title">{{ source ? '已定位来源句' : '继续上次学习' }}</text>
      <text class="scene-subtitle">{{
        source
          ? `从收藏词汇「${sourceEntry?.text ?? ''}」返回原文`
          : `${fullModel.chineseTitle} · ${locator ? '已恢复阅读位置' : '从第一句开始'}`
      }}</text>
      <view class="scene-highlight"
        ><text class="highlight-label">{{ source ? `第 ${index} 句` : '位置已恢复' }}</text
        ><text class="highlight-value" :class="{ 'source-value': source }">{{
          source ? selectedSentence?.text : `第 ${index} 句`
        }}</text
        ><text class="highlight-hint">{{
          source
            ? '该来源句已短暂高亮，方便继续阅读。'
            : `上次学习到：${selectedSentence?.text ?? ''}`
        }}</text></view
      >
      <view class="scene-section">{{ source ? '当前场景' : '接着练习' }}</view>
      <view class="position-cards">
        <button class="position-card" @click="continueReading">
          <view class="card-top"
            ><text>{{ source ? fullModel.chineseTitle : '继续场景对话' }}</text
            ><text class="card-status">{{ source ? '可学习' : '已定位' }}</text></view
          ><text class="card-hint">{{
            source ? fullModel.title : `从第 ${index} 句继续阅读`
          }}</text>
        </button>
        <button class="position-card" @click="source ? continueReading() : playCurrent()">
          <view class="card-top"
            ><text>{{ source ? `来源词汇 ${sourceEntry?.text ?? ''}` : '播放当前句原音' }}</text
            ><text class="card-status">{{
              source ? '当前句' : audio.snapshot.status === 'PLAYING' ? '播放中' : '可播放'
            }}</text></view
          ><text class="card-hint">{{
            source ? `${sourceEntry?.chinese ?? ''} · 已收藏` : `同一整段音频的第 ${index} 句`
          }}</text>
        </button>
        <button class="position-card" @click="source ? continueReading() : vocabulary()">
          <view class="card-top"
            ><text>{{ source ? '接着阅读' : '查看重点词汇' }}</text
            ><text class="card-status">{{ source ? '继续' : '下一步' }}</text></view
          ><text class="card-hint">{{
            source ? '对话、词汇与语块保持原位置' : '保持本次阅读位置'
          }}</text>
        </button>
      </view>
      <view class="scene-actions"
        ><button class="scene-action" @click="continueReading">
          {{ source ? '继续阅读' : '继续学习' }}
        </button></view
      >
    </template>
    <text v-else-if="scene.loading || sourceLoading" class="scene-loading">正在加载场景…</text>
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

.scene-highlight .source-value {
  min-height: 45px;
  font-size: 17px;
  line-height: 24px;
}

.scene-section {
  margin-top: 10px;
  margin-bottom: 5px;
}

.position-cards {
  display: grid;
  gap: 10px;

  .position-card {
    width: 100%;
    min-height: 91px;
    margin: 0;
    padding: 9px 13px;
    border: 1px solid #d6dfc9;
    border-radius: 12px;
    background: #fffdf7;
    color: #254733;
    text-align: left;
  }

  .card-top {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    font-size: 14px;
    font-weight: 700;
    line-height: 24px;
  }

  .card-status {
    flex: none;
    color: #4e7f3b;
    font-size: 10px;
    font-weight: 500;
    line-height: 23px;
  }

  .card-hint {
    display: block;
    margin-top: 4px;
    color: #6b7d6a;
    font-size: 11px;
    line-height: 22px;
  }
}
</style>
