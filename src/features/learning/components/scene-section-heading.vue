<script setup lang="ts">
import type { SceneSectionHeadingProps } from '@/shared/types/learning-components'
defineProps<SceneSectionHeadingProps>()
</script>
<template>
  <view class="section-heading"
    ><text class="heading-english">{{ english }}</text
    ><text class="heading-chinese"
      >{{ chinese }}<text v-if="count !== undefined"> {{ count }} 个</text></text
    ></view
  >
</template>
<style scoped lang="scss">
.section-heading {
  display: flex;
  flex-direction: column;
  gap: 7.692rpx;
  margin-bottom: 34.615rpx;

  .heading-english {
    font-family: Fraunces, Georgia, serif;
    font-size: 44.231rpx;
    line-height: 1.4;
    letter-spacing: -0.02em;
    font-weight: 400;
  }

  .heading-chinese {
    font-size: 23.077rpx;
    line-height: 1.7;
    color: #586c5b;
  }
}
</style>
