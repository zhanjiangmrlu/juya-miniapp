<script setup lang="ts">
import { ref } from 'vue'

import AppButton from '@/components/app-button/app-button.vue'
import AppPage from '@/components/app-page/app-page.vue'
import PageHeader from '@/components/page-header/page-header.vue'
import { validateCorrectionReason } from '@/features/contact-profile/contact-form'
import { getRuntimeServices } from '@/services/runtime'
import { navigate } from '@/shared/navigation/navigate'

const error = ref('')
const reason = ref('')

/** 同步更正原因草稿。 */
function handleInput(event: unknown) {
  reason.value = (event as { detail: { value: string } }).detail.value
}

/** 校验并提交更正原因，成功后回到管理页展示服务端状态。 */
async function submit() {
  const result = validateCorrectionReason(reason.value)
  if (!result.valid) {
    error.value = result.error
    return
  }
  await getRuntimeServices().contact.correct(result.normalizedReason)
  await navigate({ type: 'redirectTo', url: '/pages/profile/contact-manage' })
}
</script>

<template>
  <AppPage>
    <PageHeader eyebrow="受控修改" title="申请更正" />
    <textarea
      class="contact-correction__input"
      maxlength="500"
      placeholder="请说明需要更正的原因"
      :value="reason"
      @input="handleInput"
    />
    <text v-if="error" class="contact-correction__error">{{ error }}</text>
    <AppButton label="提交更正申请" @press="submit" />
  </AppPage>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.contact-correction {
  &__input {
    width: 100%;
    min-height: 280rpx;
    padding: 28rpx;
    border: 2rpx solid tokens.$color-border;
    border-radius: tokens.$radius-large;
    background: rgb(255 255 255 / 78%);
    font-size: 27rpx;
    line-height: 1.6;
  }

  &__error {
    display: block;
    margin: 16rpx 0;
    color: tokens.$color-danger;
    font-size: 23rpx;
  }
}
</style>
