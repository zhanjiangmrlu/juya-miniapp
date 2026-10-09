<script setup lang="ts">
import { onHide, onLoad, onUnload } from '@dcloudio/uni-app'
import { ref } from 'vue'

import AppState from '@/components/app-state/app-state.vue'
import DialogueList from '@/features/scene/components/dialogue-list.vue'
import ScenePageLayout from '@/features/scene/components/scene-page-layout.vue'
import { useScenePage } from '@/features/scene/use-scene-page'
import { AudioStatus } from '@/shared/enums/audio'
import { NavigationType } from '@/shared/enums/navigation'
import { navigate } from '@/shared/navigation/navigate'

const { audio, disposeAudio, fullModel, initialize, play, scene, sceneId } = useScenePage()
const retrying = ref(false)
const failedSentenceId = ref('')
/** 加载可阅读正文，query 为场景参数 */
const handleLoad = (query?: Record<string, string>) => {
  failedSentenceId.value = query?.sentenceId ?? ''
  void initialize(query?.sceneId)
}
/** 重新签名当前整段音频并播放，失败时正文保持可读 */
const retry = async () => {
  if (!fullModel.value?.audio) return
  retrying.value = true
  await play(fullModel.value.audio)
  retrying.value = false
}
/** 进入跟读页保留场景标识 */
const shadowing = async () => {
  await navigate({
    type: NavigationType.NAVIGATE_TO,
    url: `/sub-packages/scene/shadowing?sceneId=${encodeURIComponent(sceneId.value)}`
  })
}
onLoad(handleLoad)
onHide(disposeAudio)
onUnload(disposeAudio)
</script>
<template>
  <ScenePageLayout :title="fullModel?.chineseTitle.replace(/^在/, '') ?? '场景对话'">
    <template v-if="fullModel">
      <text class="scene-title">场景对话</text
      ><text class="scene-subtitle">{{ fullModel.chineseTitle }} · {{ fullModel.title }}</text>
      <view class="failure-banner" role="alert"
        ><text class="failure-mark">!</text
        ><view
          ><text class="failure-title">{{
            audio.snapshot.status === AudioStatus.PLAYING ? '音频已恢复' : '音频加载失败'
          }}</text
          ><text class="failure-hint">对话正文仍可阅读。请稍后重试音频。</text></view
        ></view
      >
      <view class="scene-section"
        ><text>正文可继续阅读</text
        ><text class="section-meta">共 {{ scene.dialogueEntries.length }} 句</text></view
      >
      <DialogueList
        :chinese-visible="false"
        :current-audio-key="audio.currentKey"
        :entries="scene.dialogueEntries"
        :status="audio.snapshot.status"
        hide-audio
        :highlighted-id="audio.snapshot.target?.sentence_id ?? failedSentenceId"
      />
      <view class="scene-actions"
        ><button
          class="scene-action"
          :class="{ 'is-disabled': retrying }"
          :disabled="retrying"
          @click="retry"
        >
          ↻ {{ retrying ? '重新加载中' : '重新加载音频' }}</button
        ><button class="scene-action secondary" @click="shadowing">进入逐句跟读 ›</button></view
      >
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
  min-height: 35px;
}

.failure-banner {
  display: flex;
  min-height: 92px;
  align-items: flex-start;
  padding: 13px;
  border: 1px solid #ffc0b0;
  border-radius: 14px;
  background: #fbeee7;
  gap: 12px;

  .failure-mark {
    display: grid;
    width: 28px;
    height: 28px;
    flex: none;
    place-items: center;
    margin-top: 3px;
    border-radius: 50%;
    background: #d45135;
    color: #fff;
    font-size: 22px;
    line-height: 28px;
  }

  .failure-title {
    display: block;
    color: #bb442c;
    font-size: 16px;
    font-weight: 700;
    line-height: 25px;
  }

  .failure-hint {
    display: block;
    margin-top: 3px;
    color: #7c645b;
    font-size: 12px;
    line-height: 21px;
  }
}

.scene-section {
  margin-top: 13px;
  margin-bottom: 7px;
}

:deep(.dialogue-sentence) {
  min-height: 57px;
}

:deep(.dialogue-list) {
  gap: 6px;
}

.scene-actions {
  padding-top: 18px;
}
</style>
