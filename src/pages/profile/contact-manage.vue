<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'

import AppButton from '@/components/app-button/app-button.vue'
import ContactForm from '@/features/contact-profile/components/contact-form.vue'
import { presentContact } from '@/features/contact-profile/contact-form'
import PersonalPage from '@/features/profile/components/personal-page.vue'
import PersonalRow from '@/features/profile/components/personal-row.vue'
import PersonalSummary from '@/features/profile/components/personal-summary.vue'
import { getRuntimeServices } from '@/services/runtime'
import { navigate } from '@/shared/navigation/navigate'
const contact = ref(presentContact(null))
const form = ref<InstanceType<typeof ContactForm>>()
const loading = ref(false)
const error = ref('')
/** 读取本人当前微信号与服务端受控修改能力 */
const load = async () => {
  try {
    contact.value = presentContact(await getRuntimeServices().contact.get())
  } catch {
    error.value = '联系资料读取失败，请重试'
  }
}
/** 复制本人完整微信号 */
const copy = () => {
  if (contact.value.wechatId) uni.setClipboardData({ data: contact.value.wechatId })
}
/** 进入更正申请 */
const correct = () => navigate({ type: 'navigateTo', url: '/pages/profile/contact-correction' })
/** 自助修改本人微信号，value 为用户同意用途后校验的微信号 */
const save = async (value: string) => {
  if (loading.value || !contact.value.canSelfEdit) return
  loading.value = true
  try {
    contact.value = presentContact(await getRuntimeServices().contact.save(value))
    uni.showToast({ icon: 'success', title: '已保存' })
  } catch {
    error.value = '无法修改，请重试或申请更正'
  } finally {
    loading.value = false
  }
}
/** 撤回本人联系资料并回到档案页 */
const remove = async () => {
  if (loading.value) return
  loading.value = true
  try {
    await getRuntimeServices().contact.remove()
    await navigate({ type: 'reLaunch', url: '/pages/profile/index' })
  } catch {
    error.value = '撤回失败，请重试'
  } finally {
    loading.value = false
  }
}
onShow(load)
</script>
<template>
  <PersonalPage
    navigation="联系资料"
    title="联系资料管理"
    :subtitle="contact.canSelfEdit ? '核对前还可自行修改 1 次' : '已核对的微信号需要提交更正申请'"
  >
    <PersonalSummary
      class="current-contact"
      label="当前微信号"
      :value="contact.wechatId || '未填写'"
      note="仅本人可见"
      compact
      ><view class="contact-tools"
        ><button @click="copy">复制</button><button @click="remove">撤回</button></view
      ></PersonalSummary
    >
    <view v-if="contact.canSelfEdit" class="manage-form"
      ><ContactForm ref="form" management :disabled="loading" @submit="save"
    /></view>
    <view v-else class="manage-form"
      ><PersonalRow title="联系状态" :detail="contact.statusLabel" badge="已核对"
    /></view>
    <text v-if="error" class="form-error">{{ error }}</text>
    <template #actions
      ><AppButton label="申请更正" variant="secondary" @press="correct" /><AppButton
        v-if="contact.canSelfEdit"
        label="保存修改"
        :loading="loading"
        @press="form?.submit()" /><AppButton
        v-else
        label="返回学习档案"
        @press="navigate({ type: 'reLaunch', url: '/pages/profile/index' })"
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

.manage-form {
  margin-top: 11px;
}

.contact-tools {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 8px;

  button {
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: #4e7f3b;
    font-size: 11px;
    line-height: 20px;

    &::after {
      border: 0;
    }
  }
}
</style>
