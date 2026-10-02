<script setup lang="ts">
withDefaults(
  defineProps<{
    padded?: boolean
    tier?: 'primary' | 'secondary'
    appearance?: 'default' | 'home'
  }>(),
  {
    padded: true,
    appearance: 'default',
    tier: 'primary'
  }
)
</script>

<template>
  <view
    class="app-page"
    :class="[
      `app-page--${tier}`,
      { 'app-page--padded': padded, 'home-theme': appearance === 'home' }
    ]"
  >
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

  &.home-theme {
    background: tokens.$home-page;
    color: tokens.$home-ink;
  }

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
