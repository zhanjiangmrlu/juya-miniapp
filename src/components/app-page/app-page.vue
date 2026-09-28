<script setup lang="ts">
withDefaults(
  defineProps<{
    padded?: boolean
    tier?: 'primary' | 'secondary'
  }>(),
  {
    padded: true,
    tier: 'primary'
  }
)
</script>

<template>
  <view class="app-page" :class="[`app-page--${tier}`, { 'app-page--padded': padded }]">
    <slot />
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/mixins.scss' as mixins;
@use '@/styles/tokens.scss' as tokens;

.app-page {
  position: relative;
  min-height: 100vh;
  color: tokens.$color-text;

  &--primary {
    background:
      radial-gradient(circle at 92% 3%, rgb(220 238 214 / 88%) 0, transparent 34%),
      tokens.$color-page-primary;
  }

  &--secondary {
    background: tokens.$color-page-secondary;
  }

  &--padded {
    @include mixins.page-padding;

    @include mixins.tablet {
      padding-right: 48rpx;
      padding-left: 48rpx;
    }
  }
}
</style>
