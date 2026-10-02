<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'

import AppState from '@/components/app-state/app-state.vue'
import AccessNotice from '@/features/learning/components/access-notice.vue'
import EntryPageShell from '@/features/learning/components/entry-page-shell.vue'
import LearningPageHeading from '@/features/learning/components/learning-page-heading.vue'
import SceneListSection from '@/features/learning/components/scene-list-section.vue'
import { useLearningPage } from '@/features/learning/use-learning-page'
const props = withDefaults(defineProps<{ initialNotice?: boolean }>(), { initialNotice: false })
const { closeNotice, learning, load, noticeVisible, openProfile, selectScene } = useLearningPage()
noticeVisible.value = props.initialNotice
/** 进入探索页时刷新安全封面与简介目录 */
const handleShow = () => {
  void load()
}
onShow(handleShow)
</script>
<template>
  <EntryPageShell active="learning">
    <LearningPageHeading large eyebrow="了解不同系列，看看更多真实场景。" title="探索更多内容" />
    <view class="preview-list"
      ><SceneListSection title="" :scenes="learning.sections.previewScenes" @select="selectScene"
    /></view>
    <AppState
      v-if="learning.error"
      title="内容暂不可用"
      icon-label="网络异常"
      description="请检查网络后重新进入。"
    />
    <view class="preview-note"
      ><text class="note-title">内容预览</text
      ><text class="note-copy"
        >可查看安全封面与简介。暂未开通的内容不会展示正文、音频或词卡。</text
      ></view
    >
    <AccessNotice
      v-if="noticeVisible"
      :show-profile-action="learning.sections.showProfileAction"
      @close="closeNotice"
      @profile="openProfile"
    />
  </EntryPageShell>
</template>
<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.preview-list {
  margin-top: 33px;
}

.preview-note {
  min-height: 91px;
  margin-top: 25px;
  padding: 14px 16px 12px;
  border-radius: 16px;
  background: tokens.$color-module;

  .note-title,
  .note-copy {
    display: block;
  }

  .note-title {
    font-size: 15px;
    font-weight: 700;
    line-height: 22px;
  }

  .note-copy {
    margin-top: 4px;
    color: tokens.$color-text-muted;
    font-size: 12px;
    line-height: 17px;
    overflow-wrap: anywhere;
  }
}
</style>
