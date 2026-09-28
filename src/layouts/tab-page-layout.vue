<script setup lang="ts">
import AppPage from '@/components/app-page/app-page.vue'
import AppTabBar, { type TabKey } from '@/components/app-tab-bar/app-tab-bar.vue'

withDefaults(defineProps<{ active: TabKey; tier?: 'primary' | 'secondary' }>(), {
  tier: 'primary'
})
</script>

<template>
  <AppPage class="tab-page-layout" :tier="tier">
    <view class="tab-page-layout__content"><slot /></view>
    <AppTabBar :active="active" />
  </AppPage>
</template>

<style scoped lang="scss">
.tab-page-layout {
  &__content {
    padding-bottom: calc(132rpx + env(safe-area-inset-bottom));
  }
}
</style>
