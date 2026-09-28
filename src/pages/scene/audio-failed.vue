<script setup lang="ts">
import SceneStatusPage from '@/features/scene/components/scene-status-page.vue'

/** 返回上一页重新触发当前音频目标的签名地址获取。 */
function retry() {
  uni.navigateBack()
}
</script>

<template>
  <SceneStatusPage
    action-label="返回重试"
    description="音频暂时未能加载，正文阅读不受影响。"
    icon-label="音频加载失败"
    title="音频暂不可用"
    @action="retry"
  />
</template>
