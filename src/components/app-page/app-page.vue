<script setup lang="ts">
import { PageAppearance, PageTier } from '@/shared/enums/ui'

import type { AppPageProps } from '@/shared/types/ui-components'

withDefaults(defineProps<AppPageProps>(), {
  padded: true,
  appearance: PageAppearance.DEFAULT,
  tier: PageTier.PRIMARY
})
</script>

<template>
  <view
    class="app-page"
    :class="[
      `app-page--${tier}`,
      { 'app-page--padded': padded, 'home-theme': appearance === PageAppearance.HOME }
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
    background: tokens.$color-page-primary;
  }

  &--secondary {
    background: tokens.$color-page-secondary;
  }

  &--padded {
    @include mixins.page-padding;

    @include mixins.tablet {
      max-width: 1120px;
      margin: 0 auto;
      padding-right: 40px;
      padding-left: 40px;
    }
  }
}
</style>
