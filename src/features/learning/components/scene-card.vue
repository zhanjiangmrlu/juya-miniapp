<script setup lang="ts">
import type { SceneCardViewModel } from '@/features/learning/catalog-presenter'

const props = withDefaults(
  defineProps<{
    compact?: boolean
    scene: SceneCardViewModel
  }>(),
  { compact: false }
)

const emit = defineEmits<{
  select: [scene: SceneCardViewModel]
}>()

/** 将整张卡片的点击统一上抛，页面再根据权限决定导航或提示。 */
function handleSelect() {
  emit('select', props.scene)
}
</script>

<template>
  <button
    class="scene-card"
    :class="{ 'scene-card--compact': compact }"
    :aria-label="`${scene.title}，${scene.accessLabel}`"
    @click="handleSelect"
  >
    <image
      v-if="scene.imageUrl"
      class="scene-card__image"
      :src="scene.imageUrl"
      mode="aspectFill"
    />
    <view v-else class="scene-card__image scene-card__image--placeholder" aria-hidden="true">
      <view class="scene-card__sprout" />
    </view>
    <view class="scene-card__body">
      <view class="scene-card__meta">
        <text class="scene-card__badge">{{ scene.accessLabel }}</text>
        <text v-if="!scene.canOpen" class="scene-card__lock">只读</text>
      </view>
      <text class="scene-card__title">{{ scene.title }}</text>
      <text class="scene-card__description">
        {{ scene.canOpen ? `${scene.chineseTitle} · ${scene.series}` : scene.description }}
      </text>
      <view v-if="scene.canOpen" class="scene-card__progress" aria-hidden="true">
        <view class="scene-card__progress-value" :style="{ width: `${scene.progress}%` }" />
      </view>
      <text v-else class="scene-card__preview-status">未开通 · 仅预览</text>
    </view>
  </button>
</template>

<style scoped lang="scss">
@use '@/styles/mixins.scss' as mixins;
@use '@/styles/tokens.scss' as tokens;

.scene-card {
  display: grid;
  width: 100%;
  min-height: 184rpx;
  align-items: center;
  margin: 0;
  padding: 20rpx;
  border: 2rpx solid rgb(201 222 209 / 78%);
  border-radius: tokens.$radius-medium;
  background: rgb(255 255 255 / 82%);
  color: tokens.$color-text;
  grid-template-columns: 184rpx minmax(0, 1fr);
  text-align: left;

  &--compact {
    min-height: 156rpx;
    grid-template-columns: 164rpx minmax(0, 1fr);
  }

  &:focus-visible {
    @include mixins.focus-ring;
  }

  &__image {
    width: 164rpx;
    height: 124rpx;
    border-radius: tokens.$radius-small;
    background: tokens.$color-module;

    &--placeholder {
      display: grid;
      place-items: center;
    }
  }

  &__sprout {
    width: 40rpx;
    height: 56rpx;
    border-right: 6rpx solid tokens.$color-primary;
    border-radius: 50%;
    transform: rotate(-24deg);
  }

  &__body {
    min-width: 0;
    padding-left: 18rpx;
  }

  &__meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: tokens.$space-2;
  }

  &__badge,
  &__lock {
    padding: 8rpx 14rpx;
    border-radius: tokens.$radius-pill;
    background: #e4f3ea;
    color: tokens.$color-primary-strong;
    font-size: 21rpx;
    line-height: 1;
  }

  &__lock {
    background: #eef1ed;
    color: tokens.$color-text-muted;
  }

  &__title {
    @include mixins.text-wrap;

    display: block;
    margin-top: 10rpx;
    font-family: Georgia, 'Noto Serif SC', serif;
    font-size: 31rpx;
    font-weight: 700;
    line-height: 1.2;
  }

  &__description,
  &__preview-status {
    @include mixins.text-wrap;

    display: block;
    margin-top: 7rpx;
    color: tokens.$color-text-muted;
    font-size: 22rpx;
    line-height: 1.4;
  }

  &__preview-status {
    color: tokens.$color-primary-strong;
    font-weight: 600;
  }

  &__progress {
    height: 10rpx;
    overflow: hidden;
    margin-top: 12rpx;
    border-radius: tokens.$radius-pill;
    background: #e8e8e0;
  }

  &__progress-value {
    height: 100%;
    border-radius: inherit;
    background: #62b381;
  }
}
</style>
