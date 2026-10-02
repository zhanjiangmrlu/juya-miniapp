<script setup lang="ts">
import { onHide, onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { computed, ref, watch } from 'vue'

import AppState from '@/components/app-state/app-state.vue'
import RecordingControls from '@/features/recording/components/recording-controls.vue'
import {
  createUniRecordingPort,
  RecordingController
} from '@/features/recording/recording-controller'
import { createRecordingSnapshot } from '@/features/recording/recording-machine'
import DialogueSentence from '@/features/scene/components/dialogue-sentence.vue'
import ScenePageLayout from '@/features/scene/components/scene-page-layout.vue'
import { useScenePage } from '@/features/scene/use-scene-page'
import { navigate } from '@/shared/navigation/navigate'

import type { AudioTarget, SceneEntry } from '@/shared/contracts/learning'

const { audio, complete, disposeAudio, fullModel, initialize, play, scene, sceneId } = useScenePage(
  { resume: false }
)
const recording = ref(createRecordingSnapshot())
const completingLearning = ref(false)
let controller: RecordingController | undefined
let loaded = false
let active = true
let lifecycle = 0
let interaction = 0
let releasing: Promise<void> | undefined
const currentSentence = computed(() =>
  scene.dialogueEntries.find((entry) => entry.entry_id === recording.value.selectedSentenceId)
)
const sentenceIndex = computed(() =>
  Math.max(
    1,
    scene.dialogueEntries.findIndex(
      (entry) => entry.entry_id === recording.value.selectedSentenceId
    ) + 1
  )
)

/** 创建本次录音控制器，仅在完整授权场景创建且不提前请求麦克风 */
const prepareRecording = () => {
  const port = createUniRecordingPort()
  const nextController = new RecordingController(port, (snapshot) => {
    if (controller === nextController) recording.value = snapshot
  })
  controller = nextController
  const first = scene.dialogueEntries[0]
  if (first) void controller.selectSentence(first.entry_id)
}
/** 加载全部句子，query 为场景路由参数 */
const handleLoad = async (query?: Record<string, string>) => {
  const request = lifecycle
  await initialize(query?.sceneId)
  if (active && request === lifecycle && fullModel.value) prepareRecording()
  loaded = true
}
/** 返回页面时重新创建已释放的本次临时录音端口 */
const handleShow = async () => {
  active = true
  if ((!loaded && lifecycle === 0) || controller) return
  const request = ++lifecycle
  await releasing
  if (!active || request !== lifecycle) return
  await initialize(sceneId.value)
  if (active && request === lifecycle && fullModel.value) prepareRecording()
}
/** 选中任意句，entry 为发布的稳定句子 */
const selectSentence = async (entry: SceneEntry) => {
  if (!active || completingLearning.value) return
  interaction++
  if (entry.entry_id === recording.value.selectedSentenceId) return
  audio.stop()
  await controller?.selectSentence(entry.entry_id)
}
/** 播放句子原音，target 为同一整段音频的句子区间 */
const playSentence = async (target: AudioTarget) => {
  const currentController = controller
  if (!active || !currentController || completingLearning.value) return
  const entry = scene.dialogueEntries.find(
    (candidate) => candidate.audio?.sentence_id === target.sentence_id
  )
  const selecting = entry ? selectSentence(entry) : Promise.resolve()
  const request = ++interaction
  await selecting
  if (!active || request !== interaction || controller !== currentController) return
  currentController.stopPlayback()
  await currentController.stop()
  if (!active || request !== interaction || controller !== currentController) return
  await play(target)
}
/** 播放当前句原音，先停止回听及录音 */
const playOriginal = async () => {
  if (currentSentence.value?.audio) await playSentence(currentSentence.value.audio)
}
/** 开始当前句录音，先停止原音播放器 */
const startRecording = async () => {
  if (!active || completingLearning.value) return
  interaction++
  audio.stop()
  await controller?.start()
}
/** 回听当前句录音，停止原音保证互斥 */
const playback = async () => {
  if (!active || completingLearning.value) return
  interaction++
  audio.stop()
  await controller?.playback()
}
/** 重录当前句，停止原音并删除旧临时文件 */
const rerecord = async () => {
  if (!active || completingLearning.value) return
  interaction++
  audio.stop()
  await controller?.rerecord()
}
/** 完成学习，服务端成功后清理本次录音并进入成果页 */
const completeLearning = async () => {
  if (completingLearning.value) return
  completingLearning.value = true
  const request = ++interaction
  try {
    if (!(await complete())) return
    if (!active || request !== interaction) return
    releaseRecording()
    await releasing
    if (!active || request !== interaction) return
    await navigate({
      type: 'redirectTo',
      url: `/pages/scene/completed?sceneId=${encodeURIComponent(sceneId.value)}`
    })
  } finally {
    completingLearning.value = false
  }
}
/** 释放当前设备，并保留清理任务供返回页面时等待 */
const releaseRecording = () => {
  if (!controller) return
  releasing = controller.dispose()
  controller = undefined
}
/** 页面退出或进入后台时立即取消原音并释放临时录音 */
const cleanup = () => {
  active = false
  lifecycle++
  interaction++
  disposeAudio()
  releaseRecording()
}
watch(fullModel, (model) => {
  if (!model && controller) {
    interaction++
    releaseRecording()
  }
})
onLoad(handleLoad)
onShow(handleShow)
onHide(cleanup)
onUnload(cleanup)
</script>
<template>
  <ScenePageLayout title="逐句跟读" centered>
    <template v-if="fullModel">
      <view class="shadowing-title"
        ><text class="scene-title">逐句跟读</text
        ><text class="shadowing-counter"
          >{{ sentenceIndex }} / {{ scene.dialogueEntries.length }}</text
        ></view
      >
      <text class="scene-subtitle">{{ fullModel.chineseTitle }} · 可从任一句开始</text>
      <view class="shadowing-sentences"
        ><DialogueSentence
          v-for="(entry, index) in scene.dialogueEntries"
          :key="entry.entry_id"
          :number="index + 1"
          :entry="entry"
          :chinese-visible="false"
          :inspect-enabled="false"
          :status="audio.snapshot.status"
          :current-audio-key="audio.currentKey"
          :selected="entry.entry_id === recording.selectedSentenceId"
          @select="selectSentence"
          @play="playSentence"
      /></view>
      <RecordingControls
        :sentence="currentSentence"
        :snapshot="recording"
        :index="sentenceIndex"
        :total="scene.dialogueEntries.length"
        :current-audio-key="audio.currentKey"
        :audio-status="audio.snapshot.status"
        @play-original="playOriginal"
        @playback="playback"
        @rerecord="rerecord"
        @start="startRecording"
        @stop="controller?.stop()"
      />
      <view class="scene-actions"
        ><button
          class="scene-action secondary"
          :disabled="completingLearning"
          @click="completeLearning"
        >
          完成本次学习 ›
        </button></view
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

.shadowing-title {
  position: relative;
  text-align: center;

  .shadowing-counter {
    position: absolute;
    top: 7px;
    right: 0;
    color: #4e7f3b;
    font-size: 14px;
    font-weight: 700;
    line-height: 28px;
  }
}

.scene-subtitle {
  min-height: 35px;
  margin-top: 2px;
}

.shadowing-sentences {
  display: grid;
  gap: 6px;
}

.scene-actions {
  padding-top: 11px;

  .scene-action {
    min-height: 42px;
    padding: 8px 14px;
  }
}
</style>
