<script setup lang="ts">
import { onHide, onLoad, onShareAppMessage, onShareTimeline, onUnload } from '@dcloudio/uni-app'

import AppImageViewer from '@/components/app-image-viewer/app-image-viewer.vue'
import AppState from '@/components/app-state/app-state.vue'
import SceneHero from '@/features/scene/components/scene-hero.vue'
import ScenePageLayout from '@/features/scene/components/scene-page-layout.vue'
import { useScenePage } from '@/features/scene/use-scene-page'
import { useAnalyticsPage } from '@/services/analytics/use-analytics-page'
import { SCENE_LEARNING_STEPS as steps } from '@/shared/constants/scene'
import { NavigationType } from '@/shared/enums/navigation'
import { ShareTarget } from '@/shared/enums/sharing'
import { navigate } from '@/shared/navigation/navigate'
import { usePageScrollLock } from '@/shared/use-page-scroll-lock'
import { useWechatShare } from '@/shared/use-wechat-share'

const {
  disposeAudio,
  fullModel,
  handleImageError,
  imageOpen,
  initialize,
  openImage,
  originalImageUrl,
  scene,
  sceneId
} = useScenePage()

/** 读取路由标识，query 为当前场景参数 */
const handleLoad = (query?: Record<string, string>) => {
  void initialize(query?.sceneId)
}
/** 打开学习步骤，page 为对应学习页路由片段 */
const openStep = async (page: string) => {
  await navigate({
    type: NavigationType.NAVIGATE_TO,
    url: `/sub-packages/scene/${page}?sceneId=${encodeURIComponent(sceneId.value)}`
  })
}

onLoad(handleLoad)
onHide(disposeAudio)
onUnload(disposeAudio)
const { pageStyle } = usePageScrollLock()
useAnalyticsPage('sub-packages/scene/detail')
const { shareReady } = useWechatShare(
  {
    target: ShareTarget.SCENE,
    scene: () =>
      fullModel.value
        ? { sceneId: fullModel.value.sceneId, title: fullModel.value.chineseTitle }
        : undefined
  },
  { onShareAppMessage, onShareTimeline }
)
</script>
<template>
  <!-- #ifdef MP-WEIXIN -->
  <page-meta :page-style="pageStyle" />
  <!-- #endif -->
  <ScenePageLayout :title="fullModel?.chineseTitle.replace(/^在/, '') ?? '场景详情'">
    <template v-if="fullModel">
      <SceneHero
        :chinese-title="fullModel.chineseTitle"
        :image-url="originalImageUrl"
        :description="fullModel.description"
        :series="fullModel.series"
        :title="fullModel.title"
        @view-image="openImage"
        @image-error="handleImageError"
      />
      <!-- #ifdef MP-WEIXIN -->
      <button v-if="shareReady" class="scene-share" open-type="share">分享这个场景</button>
      <!-- #endif -->
      <view class="detail-steps"
        ><button
          v-for="step in steps"
          :key="step.page"
          :class="{ selected: step.number === '01', chunks: step.page === 'chunks' }"
          @click="openStep(step.page)"
        >
          <text class="step-number">{{ step.number }}</text
          ><text class="step-title">{{ step.title }}</text
          ><text class="step-hint">{{ step.hint }}</text>
        </button></view
      >
      <view v-if="scene.dialogueEntries[0]" class="detail-preview"
        ><text>{{ scene.dialogueEntries[0].text }}</text
        ><text class="preview-chinese">{{ scene.dialogueEntries[0].chinese }}</text></view
      >
    </template>
    <text v-else-if="scene.loading" class="scene-loading">正在加载场景…</text>
    <AppState
      v-else
      description="请返回学习页重新确认访问权限。"
      icon-label="场景不可用"
      title="暂时无法打开场景"
    />
    <AppImageViewer
      v-if="imageOpen && fullModel && originalImageUrl"
      :title="fullModel.chineseTitle"
      :subtitle="fullModel.title"
      :image-url="originalImageUrl"
      caption="完整学习原图 · 仅在已获权限场景中查看"
      dialog-label="完整学习原图"
      close-label="关闭原图"
      @close="imageOpen = false"
      @error="handleImageError"
    />
  </ScenePageLayout>
</template>
<style scoped lang="scss">
@use '@/features/scene/scene-page.scss' as scene;
@include scene.page;

.scene-share {
  margin: 12px 0 0;
  border: 1px solid #d6dfc9;
  border-radius: 12px;
  background: #fffdf7;
  color: #254733;
  font-size: 13px;
}

.detail-steps {
  display: grid;
  margin-top: 17px;
  gap: 8px;
  grid-template-columns: repeat(3, minmax(0, 1fr));

  button {
    width: 100%;
    min-height: 119px;
    margin: 0;
    padding: 11px 5px;
    border: 1px solid #d6dfc9;
    border-radius: 16px;
    background: #fffdf7;
    color: #254733;
    text-align: center;

    &.selected {
      background: #e2eed9;
    }
  }

  text {
    display: block;
  }

  .step-number {
    font-size: 17px;
    font-weight: 700;
    line-height: 28px;
  }

  .step-title {
    margin-top: 7px;
    font-size: 14px;
    font-weight: 700;
    line-height: 23px;
  }

  .chunks .step-title {
    font-size: 12px;
  }

  .step-hint {
    margin-top: 8px;
    color: #748271;
    font-size: 10px;
    line-height: 20px;
  }
}

.detail-preview {
  margin-top: 20px;
  padding: 5px 14px;
  border: 1px solid #d6dfc9;
  border-radius: 16px;
  background: #fffdf7;
  font-size: 13px;
  line-height: 22px;

  text {
    display: block;
  }

  .preview-chinese {
    color: #748271;
    font-size: 11px;
    line-height: 20px;
  }
}
</style>
