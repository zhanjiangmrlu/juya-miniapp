<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'

import AppAvatar from '@/components/app-avatar/app-avatar.vue'
import AppPage from '@/components/app-page/app-page.vue'
import AppPrivacySheet from '@/components/app-privacy-sheet/app-privacy-sheet.vue'
import AppState from '@/components/app-state/app-state.vue'
import ProfileLogoutDialog from '@/features/profile/components/profile-logout-dialog.vue'
import { maskPhone } from '@/features/profile/contact-model'
import { Routes } from '@/shared/constants/navigation'
import { useAccountStore } from '@/stores/account-store'
const account = useAccountStore(),
  busy = ref(false),
  error = ref(''),
  privacy = ref(false),
  logoutBusy = ref(false),
  logoutConfirm = ref(false),
  logoutError = ref('')
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
/** 打开新的退出确认，清除上次取消前的错误 */
const openLogout = () => {
  logoutError.value = ''
  logoutConfirm.value = true
}
/** 确认退出后撤销服务器会话，失败保留确认框供重试 */
const logout = async () => {
  if (logoutBusy.value) return
  logoutBusy.value = true
  logoutError.value = ''
  try {
    await account.logout()
    logoutConfirm.value = false
  } catch (reason) {
    logoutError.value = reason instanceof Error ? reason.message : '退出暂未成功，请重试'
  } finally {
    logoutBusy.value = false
  }
}
onShow(() => {
  void load()
})
</script>
<template>
  <AppPage title="账号资料" back
    ><AppState :busy="busy && !account.profile" :error="error" @retry="load" /><template
      v-if="account.profile"
      ><view class="profile-summary"
        ><AppAvatar :src="account.avatarURL" :size="127" /><view
          ><text class="title">{{ account.profile.nickname || '学习者' }}</text
          ><text class="muted small">每一次学习，都留在这里</text></view
        ></view
      ><button class="profile-link" @click="editProfile">
        <text>编辑个人资料</text
        ><image
          class="chevron"
          src="/static/design/profile-chevron.svg"
          mode="aspectFit"
          aria-hidden="true"
        /></button
      ><view class="profile-section"
        ><view class="between"
          ><text class="section-title">联系方式</text
          ><button class="text-button" @click="editContact">
            {{
              account.profile.phone || account.profile.wechat_contact
                ? '修改联系方式'
                : '补充联系方式'
            }}
            <image
              class="chevron"
              src="/static/design/profile-chevron.svg"
              mode="aspectFit"
              aria-hidden="true"
            /></button></view
        ><view v-if="account.profile.phone" class="contact-row"
          ><text class="muted">手机号</text
          ><text class="contact-value">{{ maskPhone(account.profile.phone) }}</text></view
        ><view v-if="account.profile.wechat_contact" class="contact-row"
          ><text class="muted">微信号</text
          ><text class="contact-value">{{ account.profile.wechat_contact }}</text></view
        ><view v-if="!account.profile.phone && !account.profile.wechat_contact" class="no-contact"
          >未填写联系方式</view
        ><text v-if="!account.profile.phone && !account.profile.wechat_contact" class="contact-note"
          >按需补充，不影响学习和收藏。</text
        ></view
      ><view class="profile-links"
        ><button class="profile-link" @click="privacy = true">
          <text>隐私说明</text
          ><image
            class="chevron"
            src="/static/design/profile-chevron.svg"
            mode="aspectFit"
            aria-hidden="true"
          /></button></view
      ><view class="profile-bottom"
        ><button class="text-button" :disabled="logoutBusy" @click="openLogout">
          {{ logoutBusy ? '正在退出…' : '退出登录' }}</button
        ><text>学习记录与收藏会保留</text></view
      ></template
    ><ProfileLogoutDialog
      v-if="logoutConfirm"
      :busy="logoutBusy"
      :error="logoutError"
      @cancel="logoutConfirm = false"
      @confirm="logout" /><AppPrivacySheet v-if="privacy" @close="privacy = false"
  /></AppPage>
</template>
<style scoped lang="scss">
.profile-summary {
  display: flex;
  align-items: center;
  gap: 30.77rpx;
  padding: 13.46rpx 0 46.15rpx;
  margin-bottom: 5.77rpx;

  :deep(.avatar) {
    background: #e4f0db;
    color: #586c5b;
  }

  .title {
    font-size: 44.23rpx;
    font-weight: 500;
    line-height: 1.5;
    margin: 0;
  }

  .small {
    display: block;
    margin-top: 7.69rpx;
    font-size: 21.15rpx;
    line-height: 1.8;
    color: #586c5b;
  }
}

.profile-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 101.92rpx;
  border: 0;
  border-radius: 0;
  background: none;
  padding: 26.92rpx 0;
  font-size: 25rpx;
}

.chevron {
  width: 38.462rpx;
  height: 38.462rpx;
  flex-shrink: 0;
}

.profile-section {
  padding-top: 46.15rpx;
  margin-top: 55.77rpx;

  .between {
    margin-bottom: 11.54rpx;
  }

  .section-title {
    font-size: 28.85rpx;
    font-weight: 500;
    margin-bottom: 0;
  }

  .text-button {
    gap: 11.54rpx;
    min-height: 76.92rpx;
    padding: 5.77rpx 0;
    font-size: 23.08rpx;
    color: #2b4438;
  }

  .contact-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 26.92rpx;
    min-height: 109.62rpx;
    padding: 30.77rpx 0;
    font-size: 25rpx;
    border-bottom: 1px solid #dfe5d8;

    .muted {
      flex-shrink: 0;
      color: #586c5b;
    }

    .contact-value {
      overflow-wrap: anywhere;
      text-align: right;
      font-weight: 400;
      line-height: 1.8;
    }
  }

  .no-contact {
    margin: 42.31rpx 0 7.69rpx;
    color: #586c5b;
    font-size: 28.85rpx;
  }

  .contact-note {
    display: block;
    font-size: 23.08rpx;
    line-height: 1.8;
    color: #586c5b;
    margin: 13.46rpx 0;
  }
}

.profile-links {
  margin-top: 50rpx;
}

.profile-bottom {
  margin-top: 111.54rpx;
  padding-bottom: 15.38rpx;
  text-align: center;

  button {
    width: 100%;
    min-height: 76.92rpx;
    color: #ad4f32;
    font-size: 25rpx;
    margin: auto;
  }

  text {
    display: block;
    color: #586c5b;
    font-size: 19.23rpx;
    margin-top: 7.69rpx;
  }
}
</style>
