<script setup lang="ts">
import AppButton from '@/components/app-button/app-button.vue'
import AppPage from '@/components/app-page/app-page.vue'
import PageHeader from '@/components/page-header/page-header.vue'
import { navigate } from '@/shared/navigation/navigate'

/** 进入统一联系资料填写表单。 */
async function continueForm() {
  await navigate({ type: 'redirectTo', url: '/pages/profile/contact-edit' })
}
</script>

<template>
  <AppPage>
    <PageHeader eyebrow="可选资料" title="完善联系资料" />
    <view class="contact-prompt">
      <text class="contact-prompt__title">仅用于必要的学习服务联系</text>
      <text class="contact-prompt__copy">填写不会自动开通内容，也不会公开展示给其他用户。</text>
      <AppButton label="继续填写" @press="continueForm" />
    </view>
  </AppPage>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.contact-prompt {
  padding: 40rpx;
  border-radius: tokens.$radius-large;
  background: tokens.$color-module;

  &__title,
  &__copy {
    display: block;
  }

  &__title {
    font-size: 34rpx;
    font-weight: 700;
  }

  &__copy {
    margin: 20rpx 0 32rpx;
    color: tokens.$color-text-muted;
    font-size: 26rpx;
    line-height: 1.7;
  }
}
</style>
