<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { computed, inject, onBeforeUnmount, ref } from 'vue'

import AppAvatar from '@/components/app-avatar/app-avatar.vue'
import AppBottomTabs from '@/components/app-bottom-tabs/app-bottom-tabs.vue'
import AppGuestState from '@/components/app-guest-state/app-guest-state.vue'
import AppPage from '@/components/app-page/app-page.vue'
import AppState from '@/components/app-state/app-state.vue'
import ProfileLogoutDialog from '@/features/profile/components/profile-logout-dialog.vue'
// #ifdef JUYA_ANALYTICS
import { businessAnalytics } from '@/services/analytics-business'
// #endif
import { onSessionExpired, session } from '@/services/api'
import { feedbackInbox } from '@/services/feedback-service'
import { LEARNING_FEATURES } from '@/shared/constants/learning-features'
import { Routes } from '@/shared/constants/navigation'
import { PAGE_SHARE_ENTRY_KEY } from '@/shared/constants/share'
import { LearningAuthorizationStatus } from '@/shared/enums/learning-access'
import { PageBackgroundKind } from '@/shared/enums/ui'
import { useAccountStore } from '@/stores/account-store'

import type { components } from '@/shared/contracts/generated/mini-api'
import type { ProfilePageProps } from '@/shared/types/profile-components'
const props = withDefaults(defineProps<ProfilePageProps>(), { primary: false })
const pageShareEntry = inject(PAGE_SHARE_ENTRY_KEY, undefined)
const authorization = ref<components['schemas']['CurrentAccess'] | null>(null),
  authorizationError = ref(''),
  statisticsError = ref('')
/** 读取本人学习授权，失败不显示为未授权 */
const loadAuthorization = async () => {
  if (!LEARNING_FEATURES.authorization) return
  try {
    authorization.value = await session.request('/api/mini/v1/learning-access')
    authorizationError.value = ''
  } catch {
    authorizationError.value = '学习授权暂未获取，请重试'
  }
}
const account = useAccountStore(),
  busy = ref(false),
  error = ref(''),
  logoutBusy = ref(false),
  logoutConfirm = ref(false),
  logoutError = ref('')
/** 只读页面读取本人资料、学习授权和收藏数量 */
const load = async () => {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    await account.restore()
    if (session.userId()) {
      await account.refreshAvatar()
      await Promise.all([
        ...(LEARNING_FEATURES.authorization ? [loadAuthorization()] : []),
        loadStatistics()
      ])
    }
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '资料暂未获取'
  } finally {
    busy.value = false
  }
}
/** 读取收藏数量，失败时不展示为零 */
const loadStatistics = async () => {
  try {
    await account.refreshStatistics()
    statisticsError.value = ''
  } catch {
    statisticsError.value = '收藏数量暂未获取'
  }
}
const favoriteTotals = computed(() =>
  account.statistics
    ? `场景${account.statistics.favorite_count}张 · 听读${account.statistics.listening_favorite_count}篇`
    : statisticsError.value
)
const authorizationLabel = computed(() => {
  const status = authorization.value?.authorization?.status
  return status === LearningAuthorizationStatus.ACTIVE
    ? '授权有效'
    : status === LearningAuthorizationStatus.EXPIRED
      ? '已到期'
      : authorization.value?.authorization
        ? '未授权'
        : '暂未获取'
})
/** 公开设置入口保留账号来源页面栈和位置 */
const openSettings = () => uni.navigateTo({ url: `${Routes.SETTINGS}?source=profile` })
/** 编辑本人主动设置的头像昵称 */
const editProfile = () => {
  // #ifdef JUYA_ANALYTICS
  businessAnalytics.entry('profile_editProfile', Routes.IDENTITY)
  // #endif
  uni.navigateTo({ url: Routes.IDENTITY })
}
/** 打开本人场景与听读收藏 */
const favorites = () => {
  // #ifdef JUYA_ANALYTICS
  businessAnalytics.entry('profile_favorites', Routes.FAVORITES)
  // #endif
  uni.navigateTo({ url: Routes.FAVORITES })
}
/** 打开本人反馈列表，读取入口不清除未读 */
const feedback = () => {
  // #ifdef JUYA_ANALYTICS
  businessAnalytics.entry('profile_feedback', Routes.FEEDBACK)
  // #endif
  uni.navigateTo({ url: Routes.FEEDBACK })
}
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
const unsubscribe = onSessionExpired(() => {
  authorization.value = null
  authorizationError.value = ''
  statisticsError.value = ''
  logoutConfirm.value = false
  logoutError.value = ''
})
onBeforeUnmount(unsubscribe)
onShow(() => {
  if (pageShareEntry?.value) return
  if (props.primary) uni.hideTabBar({ animation: false, fail: () => undefined })
  void load()
  void feedbackInbox.refresh()
})
</script>
<template>
  <AppPage
    :background-kind="PageBackgroundKind.PROFILE"
    :title="primary ? '账号' : '账号资料'"
    :back="!primary"
    :footer="primary"
  >
    <AppGuestState
      v-if="!account.profile && !session.userId()"
      title="登录句芽英语"
      description="登录后同步收藏和学习记录。"
      :target="Routes.PROFILE"
      icon="/static/design/account.svg"
      show-privacy
    />
    <AppState :busy="busy && !account.profile" :error="error" @retry="load" />
    <template v-if="account.profile">
      <view class="profile-summary"
        ><AppAvatar :src="account.avatarURL" :size="115.385" /><view>
          <text class="profile-name">{{ account.profile.nickname || '学习者' }}</text
          ><text class="profile-tagline">每一次学习，都留在这里</text>
        </view></view
      >
      <button class="profile-link" @click="editProfile">
        <text>编辑个人资料</text
        ><image
          class="chevron"
          src="/static/design/profile-chevron.svg"
          mode="aspectFit"
          aria-hidden="true"
        />
      </button>
      <button class="profile-link" @click="favorites">
        <view class="profile-link-label"
          ><image
            class="entry-icon"
            src="/static/design/heart.svg"
            mode="aspectFit"
            aria-hidden="true"
          /><text>我的收藏</text></view
        ><view class="profile-link-value"
          ><text>{{ favoriteTotals }}</text
          ><image
            class="chevron"
            src="/static/design/profile-chevron.svg"
            mode="aspectFit"
            aria-hidden="true"
        /></view>
      </button>
      <view v-if="LEARNING_FEATURES.authorization" class="authorization-section"
        ><view class="between"
          ><text class="authorization-title">学习授权</text
          ><text
            class="authorization-badge"
            :class="{
              valid: authorization?.authorization?.status === LearningAuthorizationStatus.ACTIVE
            }"
            >{{ authorizationLabel }}</text
          ></view
        >
        <text v-if="authorization?.authorization?.expires_on" class="authorization-date"
          >到期日期{{ authorization.authorization.expires_on
          }}<text v-if="authorization.authorization.status === LearningAuthorizationStatus.ACTIVE"
            >（当日有效）</text
          ></text
        >
        <text class="authorization-help">场景学习与主题听读共用授权</text>
        <button v-if="authorizationError" class="text-button" @click="loadAuthorization">
          {{ authorizationError }}
        </button>
      </view>
      <button class="profile-link" @click="feedback">
        <view class="profile-link-label"
          ><text>我的反馈</text
          ><text
            v-if="feedbackInbox.value.value.unread"
            class="feedback-dot"
            aria-label="有未读反馈回复" /></view
        ><image
          class="chevron"
          src="/static/design/profile-chevron.svg"
          mode="aspectFit"
          aria-hidden="true"
        />
      </button>
      <button class="profile-link privacy-link" hover-class="privacy-pressed" @click="openSettings">
        <text>设置</text
        ><image
          class="chevron"
          src="/static/design/profile-chevron.svg"
          mode="aspectFit"
          aria-hidden="true"
        />
      </button>
      <view class="profile-bottom"
        ><button class="text-button logout-button" :disabled="logoutBusy" @click="openLogout">
          {{ logoutBusy ? '正在退出…' : '退出登录' }}</button
        ><text class="logout-help">学习记录与收藏会保留</text></view
      >
    </template>
    <ProfileLogoutDialog
      v-if="logoutConfirm"
      :busy="logoutBusy"
      :error="logoutError"
      @cancel="logoutConfirm = false"
      @confirm="logout"
    />
    <AppBottomTabs v-if="primary" active="profile" />
  </AppPage>
</template>
<style scoped lang="scss">
.profile-summary {
  display: flex;
  align-items: center;
  gap: 30.769rpx;
  margin-bottom: 46.154rpx;

  .profile-name {
    display: block;
    font-size: 42.308rpx;
    font-weight: 700;
    line-height: 1.5;
  }

  .profile-tagline {
    display: block;
    margin-top: 7.692rpx;
    font-size: 23.077rpx;
    color: #586c5b;
  }

  :deep(.avatar) {
    background: #e4f0db;
    color: #2b4438;
  }
}

.profile-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  width: 100%;
  min-height: 106rpx;
  padding: 23.077rpx 0;
  border: 0;
  border-bottom: 1px solid #dfe5d8;
  border-radius: 0;
  background: transparent;
  font-size: 26.923rpx;
  text-align: left;
}

.profile-link-label,
.profile-link-value {
  display: flex;
  align-items: center;
  gap: 19.231rpx;
}

.profile-link-value {
  min-width: 0;
  font-size: 23.077rpx;
  color: #586c5b;
}

.entry-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.chevron {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.authorization-section {
  padding: 34.615rpx 0;
  border-bottom: 1px solid #dfe5d8;

  .authorization-title {
    font-weight: 700;
    font-size: 26.923rpx;
  }

  .authorization-badge {
    padding: 7.692rpx 13.462rpx;
    background: #f1f3ed;
    border-radius: 9.615rpx;
    font-size: 21.154rpx;
    color: #586c5b;

    &.valid {
      background: #e4f0db;
      color: #41664d;
    }
  }

  .authorization-date,
  .authorization-help {
    display: block;
    margin-top: 11.538rpx;
    font-size: 23.077rpx;
    line-height: 1.8;
    color: #586c5b;
  }
}

.feedback-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #ad4f32;
}

.privacy-pressed {
  background: #e4f0db;
}

.profile-bottom {
  margin-top: 34.615rpx;
  text-align: center;

  .logout-button {
    width: 100%;
    min-height: 44px;
    color: #ad4f32;
    font-size: 25rpx;
  }

  .logout-help {
    display: block;
    font-size: 21.154rpx;
    color: #586c5b;
  }
}
</style>
