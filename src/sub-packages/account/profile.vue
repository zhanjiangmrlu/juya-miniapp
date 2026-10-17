<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'

import AppAvatar from '@/components/app-avatar/app-avatar.vue'
import AppPage from '@/components/app-page/app-page.vue'
import AppPrivacySheet from '@/components/app-privacy-sheet/app-privacy-sheet.vue'
import AppState from '@/components/app-state/app-state.vue'
import { maskPhone } from '@/features/profile/contact-model'
import { Routes } from '@/shared/constants/navigation'
import { useAccountStore } from '@/stores/account-store'
const account = useAccountStore(),
  busy = ref(false),
  error = ref(''),
  privacy = ref(false),
  logoutBusy = ref(false)
/** 只读页面读取真实资料，不将失败显示为没有联系方式 */
const load = async () => {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    if (await account.ensure(Routes.PROFILE)) {
      await account.restore()
      await account.refreshAvatar()
    }
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '资料暂未获取'
  } finally {
    busy.value = false
  }
}
/** 编辑本人主动设置的头像昵称 */
const editProfile = () => uni.navigateTo({ url: Routes.IDENTITY })
/** 补充或修改选填的联系方式 */
const editContact = () => uni.navigateTo({ url: Routes.CONTACT })
/** 确认退出后撤销服务器会话，失败留在当前页 */
const askLogout = () =>
  uni.showModal({
    title: '退出登录？',
    content: '本机业务会话和个人资料缓存将被清理，服务器上的学习记录与收藏会保留。',
    confirmText: '退出登录',
    cancelText: '取消',
    success: async (result) => {
      if (!result.confirm || logoutBusy.value) return
      logoutBusy.value = true
      error.value = ''
      try {
        await account.logout()
      } catch (reason) {
        error.value = reason instanceof Error ? reason.message : '退出暂未成功，请重试'
      } finally {
        logoutBusy.value = false
      }
    }
  })
onShow(() => {
  void load()
})
</script>
<template>
  <AppPage title="账号资料" back
    ><AppState :busy="busy && !account.profile" :error="error" @retry="load" /><template
      v-if="account.profile"
      ><view class="profile-summary"
        ><AppAvatar :src="account.avatarURL" :size="144" /><view
          ><text class="title">{{ account.profile.nickname || '学习者' }}</text
          ><text class="muted small">这里是你的学习账号</text></view
        ></view
      ><button class="profile-link" @click="editProfile">
        <text>编辑个人资料</text><text>›</text></button
      ><view class="profile-section"
        ><view class="between"
          ><text class="section-title">联系方式</text
          ><button class="text-button" @click="editContact">
            {{
              account.profile.phone || account.profile.wechat_contact
                ? '修改联系方式'
                : '补充联系方式'
            }}
          </button></view
        ><view v-if="account.profile.phone" class="contact-row"
          ><text class="muted">手机号</text
          ><text class="contact-value">{{ maskPhone(account.profile.phone) }}</text></view
        ><view v-if="account.profile.wechat_contact" class="contact-row"
          ><text class="muted">微信号</text
          ><text class="contact-value">{{ account.profile.wechat_contact }}</text></view
        ><view v-if="!account.profile.phone && !account.profile.wechat_contact" class="no-contact"
          >未填写联系方式</view
        ><text class="contact-note">联系方式选填，不影响学习、收藏和打卡</text></view
      ><view class="profile-links"
        ><button class="profile-link" @click="privacy = true">
          <text>隐私及用途说明</text><text>›</text>
        </button></view
      ><view class="profile-bottom"
        ><button class="text-button" :disabled="logoutBusy" @click="askLogout">
          {{ logoutBusy ? '正在退出…' : '退出登录' }}</button
        ><text>退出不影响已保存的学习成绩与收藏</text></view
      ></template
    ><AppPrivacySheet v-if="privacy" @close="privacy = false"
  /></AppPage>
</template>
<style scoped lang="scss">
.profile-summary {
  display: flex;
  align-items: center;
  gap: 32rpx;
  padding: 20rpx 0 40rpx;

  .title {
    font-size: 48rpx;
    margin-bottom: 8rpx;
  }
}

.profile-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  border: 0;
  border-bottom: 1px solid #dce2d5;
  border-radius: 0;
  background: none;
  padding: 26rpx 0;
  font-size: 28rpx;
}

.profile-section {
  border-top: 1px solid #dce2d5;
  padding-top: 44rpx;
  margin-top: 52rpx;

  .section-title {
    font-size: 32rpx;
    margin-bottom: 0;
  }

  .contact-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 28rpx;
    padding: 32rpx 0;
    font-size: 28rpx;
    border-bottom: 1px solid #e6ebdf;

    .contact-value {
      overflow-wrap: anywhere;
      text-align: right;
    }
  }

  .no-contact {
    padding: 32rpx 0;
    color: #637268;
    font-size: 28rpx;
  }

  .contact-note {
    font-size: 24rpx;
    color: #637268;
    display: block;
    margin-top: 20rpx;
  }
}

.profile-links {
  margin-top: 48rpx;
}

.profile-bottom {
  margin-top: 120rpx;
  text-align: center;

  button {
    margin: auto;
  }

  text {
    display: block;
    color: #637268;
    font-size: 22rpx;
    margin-top: 8rpx;
  }
}
</style>
