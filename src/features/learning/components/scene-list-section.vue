<script setup lang="ts">
import SceneCard from '@/features/learning/components/scene-card.vue'

import type { SceneCardViewModel } from '@/features/learning/catalog-presenter'

defineProps<{
  actionLabel?: string
  scenes: SceneCardViewModel[]
  title: string
}>()

const emit = defineEmits<{
  action: []
  select: [scene: SceneCardViewModel]
}>()

/** 将标题栏操作交给页面处理，组件不绑定具体业务路由。 */
function handleAction() {
  emit('action')
}

/** 将场景选择继续向页面透传。 */
function handleSelect(scene: SceneCardViewModel) {
  emit('select', scene)
}
</script>

<template>
  <view v-if="scenes.length > 0" class="scene-list-section">
    <view class="scene-list-section__header">
      <text class="scene-list-section__title">{{ title }}</text>
      <button v-if="actionLabel" class="scene-list-section__action" @click="handleAction">
        {{ actionLabel }}
      </button>
    </view>
    <view class="scene-list-section__list">
      <SceneCard
        v-for="scene in scenes"
        :key="scene.sceneId"
        :scene="scene"
        @select="handleSelect"
      />
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.scene-list-section {
  margin-top: tokens.$space-5;

  &__header {
    display: flex;
    min-height: 56rpx;
    align-items: center;
    justify-content: space-between;
    gap: tokens.$space-3;
    margin-bottom: tokens.$space-2;
  }

  &__title {
    font-size: 34rpx;
    font-weight: 700;
  }

  &__action {
    margin: 0;
    padding: 8rpx 0;
    border: 0;
    background: transparent;
    color: tokens.$color-primary-strong;
    font-size: 25rpx;
  }

  &__list {
    display: grid;
    gap: tokens.$space-3;
  }
}
</style>
