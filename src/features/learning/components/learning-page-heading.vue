<script setup lang="ts">
withDefaults(defineProps<{ eyebrow: string; title: string; large?: boolean }>(), { large: false })
</script>
<template>
  <view class="learning-heading" :class="{ large }">
    <text class="heading-title">{{ title }}</text>
    <text class="heading-copy">{{ eyebrow }}</text>
  </view>
</template>
<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.learning-heading {
  .heading-title,
  .heading-copy {
    display: block;
    overflow-wrap: anywhere;
  }

  .heading-title {
    font-size: 24px;
    font-weight: 700;
    line-height: 36px;
  }

  .heading-copy {
    margin-top: 4px;
    color: tokens.$color-text-muted;
    font-size: 12px;
    line-height: 20px;
  }

  &.large {
    .heading-title {
      font-size: 27px;
      line-height: 42px;
    }

    .heading-copy {
      font-size: 13px;
      margin-top: 1px;
    }
  }
}
</style>
