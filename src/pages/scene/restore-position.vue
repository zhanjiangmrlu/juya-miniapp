<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'

import SceneStatusPage from '@/features/scene/components/scene-status-page.vue'
import { navigate } from '@/shared/navigation/navigate'

const sceneId = ref('')
const sourceLocator = ref('')

/** 保存服务端返回的稳定定位，供恢复操作使用。 */
function handleLoad(query?: Record<string, string>) {
  sceneId.value = query?.sceneId ?? ''
  sourceLocator.value = query?.sourceLocator ?? ''
}

/** 回到对话页并使用稳定来源标识恢复位置。 */
async function restore() {
  await navigate({
    type: 'redirectTo',
    url: `/pages/scene/dialogue?sceneId=${encodeURIComponent(sceneId.value)}&sourceLocator=${encodeURIComponent(sourceLocator.value)}`
  })
}

onLoad(handleLoad)
</script>

<template>
  <SceneStatusPage
    action-label="恢复阅读位置"
    description="已找到你上次阅读的稳定句子位置。"
    icon-label="阅读位置"
    title="继续上次阅读"
    @action="restore"
  />
</template>
