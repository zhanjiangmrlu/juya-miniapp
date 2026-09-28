<script setup lang="ts">
import AppPage from '@/components/app-page/app-page.vue'
import PageHeader from '@/components/page-header/page-header.vue'
import AccessNotice from '@/features/learning/components/access-notice.vue'
import { navigate } from '@/shared/navigation/navigate'

/** 兼容历史入口关闭提示后返回学习列表，不提供正文入口。 */
async function handleClose() {
  await navigate({ type: 'reLaunch', url: '/pages/learning/index' })
}

/** 历史入口的资料操作只进入联系资料流程。 */
async function handleProfile() {
  await navigate({ type: 'navigateTo', url: '/pages/profile/contact-prompt' })
}
</script>

<template>
  <AppPage>
    <PageHeader eyebrow="只读预览" title="内容访问提示" />
    <AccessNotice show-profile-action @close="handleClose" @profile="handleProfile" />
  </AppPage>
</template>
