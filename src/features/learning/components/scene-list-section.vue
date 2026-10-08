<script setup lang="ts">
import SceneCard from '@/features/learning/components/scene-card.vue'

import type { SceneCardViewModel } from '@/features/learning/catalog-presenter'
withDefaults(
  defineProps<{
    actionLabel?: string
    scenes: SceneCardViewModel[]
    title: string
    compact?: boolean
    cardAction?: string
  }>(),
  { compact: false, actionLabel: undefined, cardAction: undefined }
)
const emit = defineEmits<{ action: []; select: [scene: SceneCardViewModel] }>()
/** 转发标题操作，实际行为由页面提供 */
const handleAction = () => emit('action')
/** 转发选择，scene 为被点击的安全场景摘要 */
const handleSelect = (scene: SceneCardViewModel) => emit('select', scene)
</script>
<template>
  <view v-if="scenes.length" class="scene-section" :class="{ compact, untitled: !title }">
    <view v-if="title" class="section-header"
      ><text class="section-title">{{ title }}</text
      ><button v-if="actionLabel" class="section-action" @click="handleAction">
        {{ actionLabel }}
      </button></view
    >
    <view class="scene-list"
      ><SceneCard
        v-for="scene in scenes"
        :key="scene.sceneId"
        :scene="scene"
        :compact="compact"
        :action-label="cardAction"
        @select="handleSelect"
    /></view>
  </view>
</template>
<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.scene-section {
  margin-top: 18px;

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;
    gap: 8px;
  }

  .section-title {
    font-size: 18px;
    font-weight: 700;
    line-height: 29px;
  }

  .section-action {
    margin: 0;
    padding: 0;
    color: tokens.$color-primary;
    background: transparent;
    font-size: 11px;
  }

  .scene-list {
    display: grid;
    gap: 10px;
  }

  &.compact {
    margin-top: 7px;

    .section-title {
      font-size: 17px;
      line-height: 31px;
    }
  }

  &.untitled {
    margin-top: 0;

    .scene-list {
      gap: 19px;
    }
  }
}
</style>
