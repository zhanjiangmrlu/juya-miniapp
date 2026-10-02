<script setup lang="ts">
import AppPage from '@/components/app-page/app-page.vue'
import AppTabBar, { type TabKey } from '@/components/app-tab-bar/app-tab-bar.vue'

withDefaults(
  defineProps<{
    active: TabKey
    tier?: 'primary' | 'secondary'
    appearance?: 'default' | 'home'
  }>(),
  { tier: 'primary', appearance: 'default' }
)
</script>

<template>
  <AppPage
    class="tab-layout"
    :class="{ 'home-theme': appearance === 'home' }"
    :padded="appearance !== 'home'"
    :tier="tier"
  >
    <view class="tab-content" :class="{ 'home-content': appearance === 'home' }"><slot /></view>
    <AppTabBar :active="active" :appearance="appearance" />
  </AppPage>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.tab-layout {
  &.home-theme {
    background: tokens.$home-page;
    color: tokens.$home-ink;
  }

  .tab-content {
    padding-bottom: calc(132rpx + env(safe-area-inset-bottom));

    &.home-content {
      padding-bottom: calc(103px + env(safe-area-inset-bottom));
    }
  }
}
</style>
