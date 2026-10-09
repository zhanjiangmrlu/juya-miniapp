<script setup lang="ts">
import { ref } from 'vue'

import AppButton from '@/components/app-button/app-button.vue'
import ContactForm from '@/features/contact-profile/components/contact-form.vue'
import PersonalPage from '@/features/profile/components/personal-page.vue'
import { getRuntimeServices } from '@/services/runtime'
import { navigate } from '@/shared/navigation/navigate'
const form = ref<InstanceType<typeof ContactForm>>()
const loading = ref(false)
const error = ref('')
/** 保存经用户同意的微信号，wechatId 为表单规范化后的本人微信号 */
const save = async (wechatId: string) => {
  if (loading.value) return
  loading.value = true
  try {
    await getRuntimeServices().contact.save(wechatId)
    await navigate({ type: 'redirectTo', url: '/sub-packages/profile/contact-manage' })
  } catch {
    error.value = '保存失败，请重试'
  } finally {
    loading.value = false
  }
}
/** 暂不填写并返回档案 */
const skip = () => navigate({ type: 'reLaunch', url: '/sub-packages/profile/index' })
</script>
<template>
  <PersonalPage navigation="联系资料" title="完善联系资料" subtitle="填写与否不影响开放学习场景"
    ><ContactForm ref="form" :disabled="loading" @submit="save" /><text
      v-if="error"
      class="form-error"
      >{{ error }}</text
    ><template #actions
      ><AppButton label="暂不填写" variant="secondary" @press="skip" /><AppButton
        label="保存联系资料"
        :loading="loading"
        @press="form?.submit()" /></template
  ></PersonalPage>
</template>
<style scoped lang="scss">
@use '../../features/profile/personal';
</style>
