<script setup lang="ts">
import { SurfaceTone } from '@/shared/enums/ui'

import type { SurfaceCardProps } from '@/shared/types/ui-components'

withDefaults(defineProps<SurfaceCardProps>(), {
  elevated: false,
  tone: SurfaceTone.CARD
})
</script>

<template>
  <view
    class="surface-card"
    :class="[`surface-card--${tone}`, { 'surface-card--elevated': elevated }]"
  >
    <slot />
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.surface-card {
  border: 2rpx solid tokens.$color-border;
  border-radius: tokens.$radius-large;

  &--card {
    background: tokens.$color-card;
  }

  &--module {
    background: tokens.$color-module;
  }

  &--white {
    background: tokens.$color-white;
  }

  &--elevated {
    border-color: transparent;
    box-shadow: tokens.$shadow-card;
  }
}
</style>
