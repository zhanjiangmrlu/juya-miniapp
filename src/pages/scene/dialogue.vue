<script setup lang="ts">
import { onHide, onLoad } from '@dcloudio/uni-app'

import AppButton from '@/components/app-button/app-button.vue'
import AppPage from '@/components/app-page/app-page.vue'
import PageHeader from '@/components/page-header/page-header.vue'
import DialogueList from '@/features/scene/components/dialogue-list.vue'
import { useScenePage } from '@/features/scene/use-scene-page'
import VocabularySheet from '@/features/vocabulary-sheet/components/vocabulary-sheet.vue'
import { navigate } from '@/shared/navigation/navigate'

const {
  audio,
  closeSheet,
  disposeAudio,
  favorite,
  initialize,
  inspectSentence,
  play,
  savePosition,
  scene,
  sceneId,
  scrollTarget
} = useScenePage()

/** 加载完整场景，并按来源定位恢复阅读位置。 */
function handleLoad(query?: Record<string, string>) {
  scrollTarget.value = query?.sourceLocator ?? ''
  void initialize(query?.sceneId)
}

/** 滚动到列表末尾时保存最后一条稳定来源定位。 */
function handleScrollEnd() {
  const last = scene.dialogueEntries.at(-1)
  if (last) savePosition({ entry_id: last.source_locator, offset: 0 })
}

/** 进入逐句跟读页面。 */
async function openShadowing() {
  await navigate({
    type: 'navigateTo',
    url: `/pages/scene/shadowing?sceneId=${encodeURIComponent(sceneId.value)}`
  })
}

onLoad(handleLoad)
onHide(disposeAudio)
</script>

<template>
  <AppPage>
    <PageHeader :title="scene.model?.kind === 'FULL' ? scene.model.series : '场景对话'" />
    <view class="scene-dialogue__toolbar">
      <text class="scene-dialogue__title">
        {{ scene.model?.kind === 'FULL' ? scene.model.title : '场景对话' }}
      </text>
      <button class="scene-dialogue__language" @click="scene.toggleChinese">
        {{ scene.viewState.chineseVisible ? '隐藏中文' : '显示中文' }}
      </button>
    </view>
    <scroll-view
      class="scene-dialogue__scroll"
      scroll-y
      :scroll-into-view="scrollTarget"
      @scrolltolower="handleScrollEnd"
    >
      <DialogueList
        :chinese-visible="scene.viewState.chineseVisible"
        :current-audio-key="audio.currentKey"
        :entries="scene.dialogueEntries"
        :status="audio.snapshot.status"
        @inspect="inspectSentence"
        @play="play"
      />
    </scroll-view>
    <view class="scene-dialogue__action"
      ><AppButton label="进入逐句跟读" @press="openShadowing"
    /></view>
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

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.scene-dialogue {
  &__toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20rpx;
    gap: 20rpx;
  }

  &__title {
    font-family: Georgia, serif;
    font-size: 34rpx;
    font-weight: 700;
  }

  &__language {
    flex: none;
    margin: 0;
    padding: 16rpx 20rpx;
    border: 2rpx solid tokens.$color-border;
    border-radius: tokens.$radius-small;
    background: rgb(255 255 255 / 74%);
    color: tokens.$color-primary-strong;
    font-size: 24rpx;
  }

  &__scroll {
    max-height: 64vh;
  }

  &__action {
    margin-top: 24rpx;
  }
}
</style>
