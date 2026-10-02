<script setup lang="ts">
import PageHeader from '@/components/page-header/page-header.vue'
import TabPageLayout from '@/layouts/tab-page-layout.vue'
withDefaults(
  defineProps<{
    title: string
    subtitle: string
    navigation?: string
    active?: 'favorites' | 'profile'
  }>(),
  { navigation: '', active: 'profile' }
)
</script>
<template>
  <TabPageLayout class="personal-layout" :active="active">
    <PageHeader :title="navigation || title" />
    <view class="personal-page">
      <text class="page-title">{{ title }}</text>
      <text class="page-subtitle">{{ subtitle }}</text>
      <view class="page-body"><slot /></view>
      <view v-if="$slots.actions" class="page-actions"><slot name="actions" /></view>
    </view>
    <slot name="overlay" />
  </TabPageLayout>
</template>
<style scoped lang="scss">
.personal-layout {
  :deep(.tab-content) {
    padding-bottom: calc(19.487vw + 16px + env(safe-area-inset-bottom));
  }
}

.personal-page {
  display: flex;
  min-height: calc(100vh - 115px - 19.487vw - env(safe-area-inset-bottom));
  flex-direction: column;
  max-width: 560px;
  margin: 2px auto 0;

  .page-title {
    display: block;
    min-height: 36px;
    color: #254733;
    font-size: 24px;
    font-weight: 700;
    line-height: 36px;
  }

  .page-subtitle {
    display: block;
    min-height: 38px;
    margin-top: 4px;
    color: #6e806d;
    font-size: 12px;
    line-height: 20px;
  }

  .page-body {
    padding-top: 2px;
  }

  .page-actions {
    display: grid;
    margin-top: auto;
    padding-top: 16px;
    gap: 12px;
  }

  :deep(.app-button) {
    min-height: 46px;
    background: #4e7f3b;
    font-size: 14px;
    font-weight: 500;
    line-height: 20px;
  }

  :deep([class~='app-button--secondary']) {
    border: 1px solid #7eaa6d;
    background: #fffdf7;
  }

  :deep([class~='app-button--quiet']) {
    background: transparent;
  }

  :deep([class~='app-button--danger']) {
    background: #b74635;
  }
}
</style>
