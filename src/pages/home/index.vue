<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'

import HomePageView from '@/features/home/components/home-page-view.vue'

const networkError = ref(false)

/** 读取旧入口传入的网络错误标记，并在首页当前页展示弹窗。 */
function handleLoad(query?: Record<string, string>) {
  networkError.value = query?.networkError === '1'
}

onLoad(handleLoad)
</script>

<template>
  <HomePageView :network-error="networkError" />
</template>
