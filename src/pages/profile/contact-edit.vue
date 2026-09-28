<script setup lang="ts">
import AppPage from '@/components/app-page/app-page.vue'
import PageHeader from '@/components/page-header/page-header.vue'
import ContactForm from '@/features/contact-profile/components/contact-form.vue'
import { getRuntimeServices } from '@/services/runtime'
import { navigate } from '@/shared/navigation/navigate'

/** 保存服务端规范化后的联系资料，并进入统一管理页。 */
async function save(wechatId: string) {
  await getRuntimeServices().contact.save(wechatId)
  await navigate({ type: 'redirectTo', url: '/pages/profile/contact-manage' })
}
</script>

<template>
  <AppPage>
    <PageHeader eyebrow="联系资料" title="填写微信号" />
    <ContactForm @submit="save" />
  </AppPage>
</template>
