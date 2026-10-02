<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'

import AppButton from '@/components/app-button/app-button.vue'
import { validateContactForm } from '@/features/contact-profile/contact-form'
import { composeCorrectionReason } from '@/features/contact-profile/correction-reason'
import PersonalPage from '@/features/profile/components/personal-page.vue'
import PersonalSummary from '@/features/profile/components/personal-summary.vue'
import { getRuntimeServices } from '@/services/runtime'
import { navigate } from '@/shared/navigation/navigate'
const current = ref('')
const wechatId = ref('')
const reason = ref('')
const error = ref('')
const loading = ref(false)
/** 读取本人当前微信号用于更正对照 */
const load = async () => {
  try {
    current.value = (await getRuntimeServices().contact.get())?.wechat_id || ''
  } catch {
    error.value = '联系资料读取失败，请重试'
  }
}
/** 更新更正表单，event 为输入事件，field 为需更新的微信号或原因 */
const input = (event: unknown, field: 'wechat' | 'reason') => {
  const value = (event as { detail: { value: string } }).detail.value
  if (field === 'wechat') wechatId.value = value
  else reason.value = value
}
/** 提交本人更正申请，不在客户端重置修改次数 */
const submit = async () => {
  if (loading.value) return
  const validation = validateContactForm({ consentConfirmed: true, wechatId: wechatId.value })
  const cause = composeCorrectionReason(
    validation.valid ? validation.normalizedWechatId : wechatId.value,
    reason.value
  )
  if (!validation.valid) {
    error.value = validation.error
    return
  }
  if (!cause.valid) {
    error.value = cause.error
    return
  }
  loading.value = true
  try {
    await getRuntimeServices().contact.correct(cause.normalizedReason)
    await navigate({ type: 'redirectTo', url: '/pages/profile/contact-manage' })
  } catch {
    error.value = '更正申请提交失败，请重试'
  } finally {
    loading.value = false
  }
}
/** 返回联系资料管理页 */
const back = () => navigate({ type: 'redirectTo', url: '/pages/profile/contact-manage' })
onShow(load)
</script>
<template>
  <PersonalPage title="申请更正" subtitle="已核对的微信号需要提交更正申请">
    <PersonalSummary
      class="current-contact"
      label="当前微信号"
      :value="current || '未填写'"
      note="管理员核对后可重置一次修改机会"
      compact
    />
    <text class="form-label">新的微信号</text
    ><input
      class="form-field"
      :value="wechatId"
      maxlength="20"
      placeholder="请输入更正后的微信号"
      @input="input($event, 'wechat')"
    />
    <text class="form-label correction-label">更正原因</text
    ><textarea
      class="form-field correction-reason"
      :value="reason"
      maxlength="470"
      placeholder="请简要说明需要更正的原因"
      @input="input($event, 'reason')"
    />
    <text v-if="error" class="form-error">{{ error }}</text>
    <template #actions
      ><AppButton label="返回联系资料" variant="secondary" @press="back" /><AppButton
        label="提交更正申请"
        :loading="loading"
        @press="submit"
    /></template>
  </PersonalPage>
</template>
<style scoped lang="scss">
@use '../../features/profile/personal';

.current-contact {
  margin-top: 3px;

  :deep(.summary-value) {
    font-size: 21px;
  }
}

.correction-label {
  margin-top: 18px;
}

.correction-reason {
  height: 56px;
}
</style>
