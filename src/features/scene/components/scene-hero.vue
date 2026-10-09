<script setup lang="ts">
import SceneHeading from '@/features/scene/components/scene-heading.vue'

import type { SceneHeroEmits, SceneHeroProps } from '@/shared/types/scene-components'

withDefaults(defineProps<SceneHeroProps>(), { imageUrl: '', description: '' })
const emit = defineEmits<SceneHeroEmits>()
</script>
<template>
  <view class="scene-hero">
    <button
      class="hero-image-button"
      aria-label="查看完整学习原图"
      :disabled="!imageUrl"
      @click="emit('viewImage')"
    >
      <image
        v-if="imageUrl"
        class="hero-image"
        :src="imageUrl"
        mode="aspectFill"
        @error="emit('imageError')"
      /><text v-else class="image-placeholder">学习原图加载中</text>
    </button>
    <SceneHeading :chinese-title="chineseTitle" :title="title" :series="series" spacious />
    <text class="hero-description">{{ description }}</text>
    <button class="hero-hint" @click="emit('viewImage')">轻点上方图片查看完整学习原图</button>
  </view>
</template>
<style scoped lang="scss">
.scene-hero {
  .hero-image-button {
    display: block;
    width: 100%;
    height: 250px;
    margin: 9px 0 15px;
    padding: 0;
    border: 0;
    border-radius: 12px;
    background: #e2eed9;
  }

  .hero-image {
    display: block;
    width: 100%;
    height: 250px;
    border-radius: 12px;
  }

  .image-placeholder {
    color: #748271;
    font-size: 13px;
  }

  .hero-description {
    display: block;
    margin-top: 8px;
    color: #748271;
    font-size: 13px;
    line-height: 26px;
  }

  .hero-hint {
    margin: 7px 0 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: #7d8979;
    font-size: 11px;
    line-height: 21px;
    text-align: left;

    &::after {
      border: 0;
    }
  }
}

@media (width >= 700px) {
  .scene-hero .hero-image-button,
  .scene-hero .hero-image {
    height: 360px;
  }
}

@media (height <= 820px) and (width < 700px) {
  .scene-hero .hero-image-button,
  .scene-hero .hero-image {
    height: 225px;
  }
}
</style>
