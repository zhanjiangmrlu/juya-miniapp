<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'

import SceneStatusPage from '@/features/scene/components/scene-status-page.vue'
import { navigate } from '@/shared/navigation/navigate'

const sceneId = ref('')
const sourceLocator = ref('')

/** 保存收藏来源的场景与稳定位置。 */
function handleLoad(query?: Record<string, string>) {
  sceneId.value = query?.sceneId ?? ''
  sourceLocator.value = query?.sourceLocator ?? ''
}

/** 返回仍有访问权限的原文并定位到来源句。 */
async function returnSource() {
  await navigate({
    type: 'redirectTo',
    url: `/pages/scene/dialogue?sceneId=${encodeURIComponent(sceneId.value)}&sourceLocator=${encodeURIComponent(sourceLocator.value)}`
  })
}

onLoad(handleLoad)
</script>

<template>
  <SceneStatusPage
    action-label="返回原文"
    description="将回到收藏条目的来源句，并短暂定位到对应位置。"
    icon-label="原文定位"
    title="返回原文"
    @action="returnSource"
  />
</template>
