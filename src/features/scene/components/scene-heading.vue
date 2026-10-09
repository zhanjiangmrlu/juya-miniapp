<script setup lang="ts">
import type { SceneHeadingProps } from '@/shared/types/scene-components'

withDefaults(defineProps<SceneHeadingProps>(), {
  series: '',
  spacious: false
})
</script>
<template>
  <view class="scene-heading" :class="{ spacious }">
    <text v-if="series" class="series-badge">{{ series }}</text>
    <text class="heading-chinese">{{ chineseTitle }}</text>
    <text class="heading-english">{{ title }}</text>
  </view>
</template>
<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.scene-heading {
  .series-badge {
    display: inline-block;
    min-width: 72px;
    padding: 2px 14px;
    border-radius: 12px;
    background: #e2eed9;
    font-size: 11px;
    line-height: 20px;
    text-align: center;
  }

  .heading-chinese {
    display: block;
    margin-top: 10px;
    font-size: 26px;
    font-weight: 700;
    line-height: 36px;
    overflow-wrap: anywhere;
  }

  .heading-english {
    display: block;
    color: #5c715e;
    font-size: 14px;
    line-height: 22px;
    overflow-wrap: anywhere;
  }

  &.spacious {
    .heading-chinese {
      margin-top: 17px;
      font-size: 27px;
      line-height: 37px;
    }

    .heading-english {
      margin-top: 1px;
      font-size: 17px;
      font-weight: 500;
      line-height: 29px;
    }
  }
}
</style>
