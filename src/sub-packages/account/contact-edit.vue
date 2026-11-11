<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'

import { Routes } from '@/shared/constants/navigation'

/** 旧联系方式入口直接回到账号页，游客与失效会话均不发起登录 */
const returnToProfile = () => {
  uni.switchTab({ url: Routes.PROFILE })
}
onLoad(returnToProfile)
</script>
<template><view /></template>
