<script setup lang="ts">
import { ref } from 'vue'

import AppButton from '@/components/app-button/app-button.vue'
import { validateContactForm } from '@/features/contact-profile/contact-form'

const props = withDefaults(
  defineProps<{
    initialValue?: string
    submitLabel?: string
  }>(),
  { initialValue: '', submitLabel: '保存联系资料' }
)

const emit = defineEmits<{
  submit: [wechatId: string]
}>()

const consentConfirmed = ref(false)
const error = ref('')
const wechatId = ref(props.initialValue)

/** 从 uni-app 输入事件同步微信号草稿。 */
function handleInput(event: unknown) {
  wechatId.value = (event as { detail: { value: string } }).detail.value
}

/** 同步协议确认状态。 */
function handleConsent(event: unknown) {
  consentConfirmed.value = (event as { detail: { value: string[] } }).detail.value.length > 0
}

/** 校验后提交规范化微信号，不记录或打印原值。 */
function handleSubmit() {
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
</script>

<template>
  <view class="contact-form">
    <text class="contact-form__label">微信号</text>
    <input
      class="contact-form__input"
      :value="wechatId"
      maxlength="20"
      placeholder="请输入 6 至 20 位微信号"
      @input="handleInput"
    />
    <checkbox-group class="contact-form__consent" @change="handleConsent">
      <label>
        <checkbox value="confirmed" color="#2f7d61" />
        <text>我已阅读并同意联系资料使用说明</text>
      </label>
    </checkbox-group>
    <text v-if="error" class="contact-form__error">{{ error }}</text>
    <AppButton :label="submitLabel" @press="handleSubmit" />
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.contact-form {
  padding: 32rpx;
  border: 2rpx solid tokens.$color-border;
  border-radius: tokens.$radius-large;
  background: rgb(255 255 255 / 78%);

  &__label {
    display: block;
    font-size: 27rpx;
    font-weight: 700;
  }

  &__input {
    height: 88rpx;
    margin: 16rpx 0 24rpx;
    padding: 0 24rpx;
    border: 2rpx solid tokens.$color-border;
    border-radius: tokens.$radius-medium;
    background: tokens.$color-white;
    font-size: 27rpx;
  }

  &__consent {
    margin-bottom: 24rpx;
    color: tokens.$color-text-muted;
    font-size: 23rpx;
    line-height: 1.5;
  }

  &__error {
    display: block;
    margin-bottom: 18rpx;
    color: tokens.$color-danger;
    font-size: 23rpx;
  }
}
</style>
