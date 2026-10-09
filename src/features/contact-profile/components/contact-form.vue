<script setup lang="ts">
import { ref } from 'vue'

import { validateContactForm } from '@/features/contact-profile/contact-form'
withDefaults(defineProps<{ management?: boolean; disabled?: boolean }>(), {
  management: false,
  disabled: false
})
const emit = defineEmits<{ submit: [wechatId: string] }>()
const consentConfirmed = ref(false)
const error = ref('')
const wechatId = ref('')
/** 同步微信号输入，event 为原生表单输入事件 */
const input = (event: unknown) => {
  wechatId.value = (event as { detail: { value: string } }).detail.value
}
/** 同步用途同意，event 为复选框选择事件 */
const consent = (event: unknown) => {
  consentConfirmed.value = (event as { detail: { value: string[] } }).detail.value.length > 0
}
/** 校验并提交本人联系资料 */
const submit = () => {
  const result = validateContactForm({
    consentConfirmed: consentConfirmed.value,
    wechatId: wechatId.value
  })
  if (!result.valid) {
    error.value = result.error
    return
  }
  error.value = ''
  emit('submit', result.normalizedWechatId)
}
defineExpose({ submit })
</script>
<template>
  <view class="contact-form">
    <text class="form-label">{{ management ? '新的微信号' : '微信号' }}</text>
    <input
      class="form-field"
      :value="wechatId"
      maxlength="20"
      :placeholder="management ? '请输入修改后的微信号' : '请输入你的微信号'"
      :disabled="disabled"
      @input="input"
    />
    <text class="form-label purpose-label">{{ management ? '用途确认' : '用途说明' }}</text>
    <view class="form-field purpose-copy">{{
      management ? '修改时需再次确认联系用途。' : '用于必要的服务联系、内容体验回访和问题跟进。'
    }}</view>
    <checkbox-group class="consent" @change="consent"
      ><label class="consent-label"
        ><checkbox
          class="consent-checkbox"
          value="confirmed"
          color="#4e7f3b"
          :disabled="disabled"
        /><text>{{
          management ? '我同意按说明使用本次提交的微信号' : '我已阅读并同意上述用途说明'
        }}</text></label
      ></checkbox-group
    >
    <view v-if="!management" class="voluntary"
      ><text class="voluntary-title">填写联系资料是自愿的</text
      ><text>填写不会自动获得新的学习权限，也不影响已开放的学习内容。</text></view
    >
    <text v-if="error" class="form-error" role="alert">{{ error }}</text>
  </view>
</template>
<style scoped lang="scss">
@use '../../profile/personal';

.contact-form {
  padding-top: 3px;

  .form-label {
    margin-top: 0;
  }

  .purpose-label {
    margin-top: 18px;
  }

  .purpose-copy {
    display: flex;
    align-items: center;
    color: #7a8978;
    line-height: 18px;
  }

  .consent {
    display: block;
    margin-top: 27px;
    color: #5c715e;
    font-size: 12px;
    line-height: 20px;

    .consent-label {
      display: flex;
      align-items: center;
    }

    .consent-checkbox {
      transform: scale(0.55);
      transform-origin: left center;
      width: 15px;
    }
  }

  .voluntary {
    min-height: 87px;
    margin-top: 40px;
    padding: 11px 15px;
    border-radius: 12px;
    background: #e5efdc;
    color: #667967;
    font-size: 11px;
    line-height: 20px;

    .voluntary-title {
      display: block;
      min-height: 27px;
      color: #254733;
      font-size: 13px;
      font-weight: 700;
    }
  }
}
</style>
