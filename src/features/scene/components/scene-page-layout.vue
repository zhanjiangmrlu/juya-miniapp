<script setup lang="ts">
import PageHeader from '@/components/page-header/page-header.vue'
import TabPageLayout from '@/layouts/tab-page-layout.vue'
import { TabKey } from '@/shared/enums/navigation'
import { PageTier } from '@/shared/enums/ui'

import type { ScenePageLayoutProps } from '@/shared/types/scene-components'

withDefaults(defineProps<ScenePageLayoutProps>(), { centered: false })
</script>

<template>
  <TabPageLayout :active="TabKey.LEARNING" :tier="PageTier.SECONDARY">
    <PageHeader :title="title" :centered="centered" />
    <view class="scene-content"><slot /></view>
  </TabPageLayout>
</template>

<style scoped lang="scss">
.scene-content {
  display: flex;
  min-height: calc(100vh - 174px - env(safe-area-inset-bottom));
  flex-direction: column;
  margin-top: -2px;
  padding-bottom: 12px;
}

@media (width >= 700px) {
  .scene-content {
    min-height: calc(100vh - 248px - env(safe-area-inset-bottom));
  }
}
</style>
