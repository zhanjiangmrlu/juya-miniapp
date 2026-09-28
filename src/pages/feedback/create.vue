<script setup lang="ts">
import AppPage from '@/components/app-page/app-page.vue'
import PageHeader from '@/components/page-header/page-header.vue'
import FeedbackForm from '@/features/feedback/components/feedback-form.vue'
</script>

<template>
  <AppPage>
    <PageHeader eyebrow="问题反馈不是即时聊天" title="提交问题反馈" />
    <FeedbackForm />
  </AppPage>
</template>
