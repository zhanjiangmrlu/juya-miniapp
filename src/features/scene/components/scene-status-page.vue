<script setup lang="ts">
import AppButton from '@/components/app-button/app-button.vue'
import AppPage from '@/components/app-page/app-page.vue'
import AppState from '@/components/app-state/app-state.vue'
import PageHeader from '@/components/page-header/page-header.vue'

import type { SceneStatusPageEmits, SceneStatusPageProps } from '@/shared/types/scene-components'

defineProps<SceneStatusPageProps>()

const emit = defineEmits<SceneStatusPageEmits>()

/** 将状态页主操作交给具体路由页面处理。 */
function handleAction() {
  emit('action')
}
</script>

<template>
  <AppPage>
    <PageHeader :title="title" />
    <AppState :description="description" :icon-label="iconLabel" :title="title">
      <AppButton :label="actionLabel" @press="handleAction" />
    </AppState>
  </AppPage>
</template>
