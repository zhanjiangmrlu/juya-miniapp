<script setup lang="ts">
import { onHide, onLoad, onUnload } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

import AppButton from '@/components/app-button/app-button.vue'
import AppPage from '@/components/app-page/app-page.vue'
import PageHeader from '@/components/page-header/page-header.vue'
import RecordingControls from '@/features/recording/components/recording-controls.vue'
import {
  createUniRecordingPort,
  RecordingController
} from '@/features/recording/recording-controller'
import { createRecordingSnapshot } from '@/features/recording/recording-machine'
import { useScenePage } from '@/features/scene/use-scene-page'
import { getRuntimeServices } from '@/services/runtime'
import { navigate } from '@/shared/navigation/navigate'

const { disposeAudio, initialize, play, scene, sceneId } = useScenePage()
const recording = ref(createRecordingSnapshot())
const controller = new RecordingController(createUniRecordingPort(), (snapshot) => {
  recording.value = snapshot
})
const currentSentence = computed(() =>
  scene.dialogueEntries.find((entry) => entry.entry_id === recording.value.selectedSentenceId)
)

/** 加载场景全部句子，并默认选中第一句但不自动请求录音权限。 */
async function handleLoad(query?: Record<string, string>) {
  await initialize(query?.sceneId)
  const first = scene.dialogueEntries[0]
  if (first) controller.selectSentence(first.entry_id)
}

/** 切换到任意句，停止上一句录音或回听。 */
function selectSentence(id: string) {
  controller.selectSentence(id)
}

/** 播放当前句原音，不受录音权限状态影响。 */
async function playOriginal() {
  if (currentSentence.value?.audio) await play(currentSentence.value.audio)
}

/** 完成本次学习，清理录音文件后进入成果页。 */
async function completeLearning() {
  await getRuntimeServices().scene.complete(sceneId.value)
  await controller.dispose()
  await navigate({
    type: 'redirectTo',
    url: `/pages/scene/completed?sceneId=${encodeURIComponent(sceneId.value)}`
  })
}

/** 页面进入后台时停止音频并清理本次临时录音。 */
function handleHide() {
  disposeAudio()
  void controller.dispose()
}

/** 页面卸载时再次执行幂等清理，覆盖退出和异常关闭。 */
function handleUnload() {
  void controller.dispose()
}

onLoad(handleLoad)
onHide(handleHide)
onUnload(handleUnload)
</script>

<template>
  <AppPage>
    <PageHeader eyebrow="不评分" title="逐句跟读" />
    <view class="shadowing-page__summary">
      <text>场景对话</text>
      <text>{{ scene.dialogueEntries.length }} 句 · 可从任一句开始</text>
    </view>
    <view class="shadowing-page__sentences">
      <button
        v-for="(entry, index) in scene.dialogueEntries"
        :key="entry.entry_id"
        class="shadowing-page__sentence"
        :class="{
          'shadowing-page__sentence--active': entry.entry_id === recording.selectedSentenceId
        }"
        @click="selectSentence(entry.entry_id)"
      >
        <text class="shadowing-page__number">{{ index + 1 }}</text>
        <view>
          <text class="shadowing-page__speaker">{{ entry.speaker }}</text>
          <text class="shadowing-page__copy">{{ entry.text }}</text>
          <text v-if="entry.chinese" class="shadowing-page__chinese">{{ entry.chinese }}</text>
        </view>
        <text class="shadowing-page__select">选择</text>
      </button>
    </view>
    <RecordingControls
      :sentence="currentSentence"
      :snapshot="recording"
      @play-original="playOriginal"
      @playback="controller.playback"
      @rerecord="controller.rerecord"
      @start="controller.start"
      @stop="controller.stop"
    />
    <view class="shadowing-page__complete">
      <AppButton label="完成本次学习" @press="completeLearning" />
    </view>
  </AppPage>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.shadowing-page {
  &__summary {
    display: flex;
    justify-content: space-between;
    margin: 16rpx 4rpx;
    color: tokens.$color-primary-strong;
    font-size: 23rpx;
  }

  &__sentences {
    display: grid;
    gap: 14rpx;
  }

  &__sentence {
    display: grid;
    width: 100%;
    align-items: center;
    margin: 0;
    padding: 22rpx;
    border: 2rpx solid tokens.$color-border;
    border-radius: tokens.$radius-medium;
    background: rgb(255 255 255 / 68%);
    color: tokens.$color-text;
    gap: 18rpx;
    grid-template-columns: 52rpx minmax(0, 1fr) auto;
    text-align: left;

    &--active {
      border-color: tokens.$color-primary;
      background: tokens.$color-module;
    }
  }

  &__number {
    display: grid;
    width: 48rpx;
    height: 48rpx;
    place-items: center;
    border-radius: 50%;
    background: #edf5ef;
    color: tokens.$color-primary;
    font-size: 22rpx;
    font-weight: 700;
  }

  &__speaker,
  &__copy,
  &__chinese {
    display: block;
  }

  &__speaker {
    color: tokens.$color-primary;
    font-size: 21rpx;
    font-weight: 700;
  }

  &__copy {
    font-family: Georgia, serif;
    font-size: 24rpx;
  }

  &__chinese,
  &__select {
    color: tokens.$color-text-muted;
    font-size: 19rpx;
  }

  &__complete {
    margin-top: 24rpx;
  }
}
</style>
