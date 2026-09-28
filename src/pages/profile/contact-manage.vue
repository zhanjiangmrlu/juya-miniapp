<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'

import AppButton from '@/components/app-button/app-button.vue'
import AppPage from '@/components/app-page/app-page.vue'
import PageHeader from '@/components/page-header/page-header.vue'
import { presentContact } from '@/features/contact-profile/contact-form'
import { getRuntimeServices } from '@/services/runtime'
import { navigate } from '@/shared/navigation/navigate'

const contact = ref(presentContact(null))

/** 读取服务端修改次数和自助修改能力，不在本地累加。 */
async function loadContact() {
  contact.value = presentContact(await getRuntimeServices().contact.get())
}

/** 根据服务端 can_self_edit 决定进入修改还是更正申请。 */
async function editContact() {
  await navigate({
    type: 'navigateTo',
    url: contact.value.canSelfEdit
      ? '/pages/profile/contact-edit'
      : '/pages/profile/contact-correction'
  })
}

/** 撤回微信号后返回档案页。 */
async function removeContact() {
  await getRuntimeServices().contact.remove()
  await navigate({ type: 'reLaunch', url: '/pages/profile/index' })
}

onShow(loadContact)
</script>

<template>
  <AppPage>
    <PageHeader eyebrow="联系资料" title="查看与管理" />
    <view class="contact-manage">
      <text class="contact-manage__label">微信号</text>
      <text class="contact-manage__value">{{ contact.wechatId ?? '未填写' }}</text>
      <text class="contact-manage__meta">已自助修改 {{ contact.selfEditCount }} 次</text>
    </view>
    <view class="contact-manage__actions">
      <AppButton :label="contact.canSelfEdit ? '修改联系资料' : '申请更正'" @press="editContact" />
      <AppButton label="撤回联系资料" variant="quiet" @press="removeContact" />
    </view>
  </AppPage>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.contact-manage {
  padding: 36rpx;
  border: 2rpx solid tokens.$color-border;
  border-radius: tokens.$radius-large;
  background: rgb(255 255 255 / 76%);

  &__label,
  &__value,
  &__meta {
    display: block;
  }

  &__label,
  &__meta {
    color: tokens.$color-text-muted;
    font-size: 23rpx;
  }

  &__value {
    margin-top: 18rpx;
    font-size: 36rpx;
    font-weight: 700;
  }

  &__meta {
    margin-top: 20rpx;
  }

  &__actions {
    display: grid;
    margin-top: 28rpx;
    gap: 8rpx;
  }
}
</style>
