<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'

import { presentContact } from '@/features/contact-profile/contact-form'
import ProfileIdentity from '@/features/profile/components/profile-identity.vue'
import TabPageLayout from '@/layouts/tab-page-layout.vue'
import { getRuntimeServices } from '@/services/runtime'
import { navigate } from '@/shared/navigation/navigate'

import type { UserProfile } from '@/shared/contracts/profile'

const profile = ref<UserProfile>()
const contact = ref(presentContact(null))

/** 每次显示档案页时重新读取本人资料和联系资料事实。 */
async function loadProfile() {
  const runtime = getRuntimeServices()
  const [profileResponse, contactResponse] = await Promise.all([
    runtime.profile.get(),
    runtime.contact.get()
  ])
  profile.value = profileResponse
  contact.value = presentContact(contactResponse)
}

/** 根据是否填写微信号进入填写或管理流程。 */
async function openContact() {
  await navigate({
    type: 'navigateTo',
    url: contact.value.wechatId ? '/pages/profile/contact-manage' : '/pages/profile/contact-prompt'
  })
}

onShow(loadProfile)
</script>

<template>
  <TabPageLayout active="profile">
    <text class="profile-page__eyebrow">学习档案</text>
    <text class="profile-page__title">{{ profile?.nickname ?? '学习者' }}</text>
    <text class="profile-page__description">你的身份、权益和学习记录都在这里。</text>
    <ProfileIdentity
      :juya-id="profile?.juya_id ?? '正在加载'"
      :wechat-label="contact.wechatId ? `微信号：${contact.wechatId}` : contact.statusLabel"
      @contact="openContact"
    />
  </TabPageLayout>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.profile-page {
  &__eyebrow,
  &__title,
  &__description {
    display: block;
  }

  &__eyebrow {
    color: tokens.$color-primary;
    font-size: 23rpx;
    font-weight: 700;
  }

  &__title {
    margin-top: 8rpx;
    font-family: Georgia, serif;
    font-size: 48rpx;
    font-weight: 700;
  }

  &__description {
    margin-top: 12rpx;
    color: tokens.$color-text-muted;
    font-size: 25rpx;
  }
}
</style>
