<script setup lang="ts">
import { onHide, onUnload } from '@dcloudio/uni-app'
import { ref } from 'vue'

import AppButton from '@/components/app-button/app-button.vue'
import ContactForm from '@/features/contact-profile/components/contact-form.vue'
import PersonalPage from '@/features/profile/components/personal-page.vue'
import { getAnalytics } from '@/services/analytics/runtime'
import { useAnalyticsPage } from '@/services/analytics/use-analytics-page'
import { getRuntimeServices } from '@/services/runtime'
import { AnalyticsEvent } from '@/shared/enums/analytics'
import { NavigationType } from '@/shared/enums/navigation'
import { ButtonVariant } from '@/shared/enums/ui'
import { navigate } from '@/shared/navigation/navigate'
const form = ref<InstanceType<typeof ContactForm>>()
const loading = ref(false)
const error = ref('')
let generation = 0
onHide(() => generation++)
onUnload(() => generation++)
/** 保存经用户同意的微信号，wechatId 为表单规范化后的本人微信号 */
const save = async (wechatId: string) => {
  const token = getAnalytics().capture()
  const request = generation
  if (loading.value) return
  loading.value = true
  try {
    await getRuntimeServices().contact.save(wechatId)
    if (request === generation)
      getAnalytics().track(
        AnalyticsEvent.CONTACT_SAVE_SUCCESS,
        { entry_source: 'contact_fill' },
        { token }
      )
    await navigate({
      type: NavigationType.REDIRECT_TO,
      url: '/sub-packages/profile/contact-manage'
    })
  } catch {
    error.value = '保存失败，请重试'
  } finally {
    loading.value = false
  }
}
/** 暂不填写并返回档案 */
const skip = () => navigate({ type: NavigationType.RE_LAUNCH, url: '/sub-packages/profile/index' })
useAnalyticsPage('sub-packages/profile/contact-edit')
</script>
<template>
  <PersonalPage navigation="联系资料" title="完善联系资料" subtitle="填写与否不影响开放学习场景"
    ><ContactForm ref="form" :disabled="loading" @submit="save" /><text
      v-if="error"
      class="form-error"
      >{{ error }}</text
    ><template #actions
      ><AppButton label="暂不填写" :variant="ButtonVariant.SECONDARY" @press="skip" /><AppButton
        label="保存联系资料"
        :loading="loading"
        @press="form?.submit()" /></template
  ></PersonalPage>
</template>
<style scoped lang="scss">
@use '../../features/profile/personal';
</style>
