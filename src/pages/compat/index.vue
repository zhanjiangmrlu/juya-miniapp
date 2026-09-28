<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'

import AppState from '@/components/app-state/app-state.vue'
import { resolveLegacyRoute } from '@/shared/navigation/legacy-routes'
import { navigate } from '@/shared/navigation/navigate'

/** 页面加载后立即解析旧版参数，并跳转到 V1.3 对应页面。 */
onLoad((query) => {
  void navigate(
    resolveLegacyRoute({
      pageId: query?.pageId ?? '',
      sceneId: query?.sceneId,
      sourceLocator: query?.sourceLocator
    })
  )
})
</script>

<template>
  <AppState description="正在恢复你上次访问的位置" icon-label="页面跳转" title="正在前往句芽英语" />
</template>
