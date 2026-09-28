<script setup lang="ts">
import { onHide, onLoad } from '@dcloudio/uni-app'

import AppButton from '@/components/app-button/app-button.vue'
import AppPage from '@/components/app-page/app-page.vue'
import AppState from '@/components/app-state/app-state.vue'
import PageHeader from '@/components/page-header/page-header.vue'
import AudioButton from '@/features/audio/components/audio-button.vue'
import DialogueList from '@/features/scene/components/dialogue-list.vue'
import SceneHero from '@/features/scene/components/scene-hero.vue'
import { useScenePage } from '@/features/scene/use-scene-page'
import { navigate } from '@/shared/navigation/navigate'

const { audio, disposeAudio, fullModel, initialize, play, sceneId } = useScenePage()

/** 根据路由场景标识加载详情，打开动作由服务端最终判定权限。 */
function handleLoad(query?: Record<string, string>) {
  void initialize(query?.sceneId)
}

/** 进入完整对话页并保留当前稳定场景标识。 */
async function openDialogue() {
  await navigate({
    type: 'navigateTo',
    url: `/pages/scene/dialogue?sceneId=${encodeURIComponent(sceneId.value)}`
  })
}

onLoad(handleLoad)
onHide(disposeAudio)
</script>

<template>
  <AppPage>
    <PageHeader :title="fullModel?.series ?? '场景详情'" />
    <template v-if="fullModel">
      <SceneHero
        :chinese-title="fullModel.chineseTitle"
        :image-url="fullModel.imageUrl"
        :series="fullModel.series"
        :title="fullModel.title"
      />
      <view class="scene-detail__audio-row">
        <AudioButton
          v-if="fullModel.entries[0]?.audio"
          :current-key="audio.currentKey"
          label="播放场景"
          :status="audio.snapshot.status"
          :target="fullModel.entries[0].audio"
          @play="play"
        />
      </view>
      <DialogueList
        :chinese-visible="false"
        :current-audio-key="audio.currentKey"
        :entries="fullModel.entries.filter((entry) => entry.entry_type === 'DIALOGUE').slice(0, 2)"
        :status="audio.snapshot.status"
        @play="play"
      />
      <view class="scene-detail__action"
        ><AppButton label="进入完整对话" @press="openDialogue"
      /></view>
    </template>
    <AppState
      v-else
      description="正在确认内容权限，请稍后重试或返回学习页。"
      icon-label="场景不可用"
      title="暂时无法打开场景"
    />
  </AppPage>
</template>

<style scoped lang="scss">
.scene-detail {
  &__audio-row {
    display: flex;
    margin: 28rpx 0 20rpx;
  }

  &__action {
    margin-top: 28rpx;
  }
}
</style>
