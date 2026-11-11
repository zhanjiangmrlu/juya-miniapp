<script setup lang="ts">
import { ref, watch } from 'vue'

import AppConsentDialog from '@/components/app-consent-dialog/app-consent-dialog.vue'
import { session } from '@/services/api'
import { automaticConsent, openPolicy, readingPolicy } from '@/services/consent-coordinator'
import { dismissLoginPrompt, loginPromptAction, loginPromptTarget } from '@/services/login-prompt'
import { loginReturn } from '@/services/login-return'
import { openLogin, safeTarget } from '@/services/navigation'
import { privacy } from '@/services/privacy'
import { ConsentAction } from '@/shared/enums/privacy'
import { useAccountStore } from '@/stores/account-store'
const busy = ref(false),
  error = ref('')
let attempt = 0,
  started = false
let invalidate: (() => void) | undefined
/** 保留legacy必要登录入口，不取得统计许可 */
const login = () => {
  const target = loginPromptTarget.value
  dismissLoginPrompt()
  openLogin(target)
}
/** 取消在途身份交换并仅恢复来源阅读展示 */
const cancel = () => {
  attempt++
  busy.value = false
  error.value = ''
  if (started) {
    invalidate?.()
    loginReturn.resumeGuest(true)
  }
  started = false
  automaticConsent.value = false
  dismissLoginPrompt()
}
/** 确认用户当前选择后复用可信微信登录，成功不提交旧操作
 * @param enabled 当前是否明确选择可选统计许可
 */
const choose = async (enabled: boolean) => {
  if (busy.value) return
  busy.value = true
  error.value = ''
  const allowStatistics = loginPromptAction.value !== ConsentAction.STATISTICS && enabled
  const run = ++attempt,
    target = safeTarget(loginPromptTarget.value)
  try {
    const confirmation =
      privacy.confirmation() ||
      privacy.confirm(automaticConsent.value ? 'first_launch' : 'account_action')
    if (run !== attempt) return
    invalidate = () => session.invalidate()
    const account = useAccountStore()
    if (session.userId() && !started) {
      await session.request('/api/mini/v1/me/agreements', {
        method: 'POST',
        key: confirmation.confirmation_id,
        body: confirmation
      })
    } else {
      if (!started) {
        loginReturn.begin(target)
        started = true
        session.invalidate()
      }
      await account.login(true, {
        agreement_confirmation: confirmation,
        analytics_choice: { enabled: allowStatistics, scope_version: privacy.version('analytics') }
      })
    }
    if (run !== attempt) return
    if (!allowStatistics) privacy.block(session.userId()!)
    try {
      await privacy.restore(session.userId()!)
      if (!allowStatistics || privacy.state.value?.analytics.enabled !== allowStatistics)
        await privacy.choose(allowStatistics)
    } catch {
      /* 统计同步失败保留关闭，不撤销已成功的必要登录 */
    }
    if (run !== attempt) return
    loginReturn.succeed()
    started = false
    automaticConsent.value = false
    dismissLoginPrompt()
    loginReturn.resumeGuest(true)
  } catch (reason) {
    if (run === attempt)
      error.value = reason instanceof Error ? reason.message : '登录暂未成功，请重试'
  } finally {
    if (run === attempt) busy.value = false
  }
}
watch(loginPromptTarget, (target) => {
  if (!target && started) cancel()
})
</script>
<template>
  <AppConsentDialog
    v-if="loginPromptTarget && privacy.published() && !readingPolicy"
    :first="automaticConsent"
    :confirmed="privacy.confirmed()"
    :action="loginPromptAction"
    :busy="busy"
    :error="error"
    @login="choose"
    @close="cancel"
    @policy="openPolicy"
  />
  <view
    v-else-if="loginPromptTarget && !readingPolicy"
    class="login-prompt"
    role="dialog"
    aria-modal="true"
    aria-label="登录后保存到你的账号"
    @touchmove.stop.prevent
    ><view class="dialog"
      ><text class="title">登录后保存到你的账号</text
      ><text class="copy">收藏、学习记录和打卡需要账号同步。也可以继续浏览免费内容。</text
      ><button class="primary" @click="login">登录</button
      ><button class="secondary" @click="cancel">继续浏览</button></view
    ></view
  >
</template>
<style scoped lang="scss">
.login-prompt {
  position: fixed;
  z-index: 200;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 46.154rpx;
  background: rgb(43 68 56 / 30%);

  .dialog {
    width: 100%;
    max-width: 657.692rpx;
    padding: 48.077rpx;
    border-radius: 30.769rpx;
    background: #fffcf5;
  }

  .title,
  .copy {
    display: block;
  }

  .title {
    font-size: 38.462rpx;
    font-weight: 700;
    line-height: 57.692rpx;
  }

  .copy {
    margin: 28.846rpx 0 38.462rpx;
    font-size: 25rpx;
    line-height: 47.5rpx;
    color: #586c5b;
  }

  button {
    width: 100%;
    min-height: 84.615rpx;
    padding: 0;
    border-radius: 17.308rpx;
    font-size: 25rpx;
    line-height: 82.615rpx;
  }

  .primary {
    font-weight: 700;
    background: #c8e2b5;
    border-color: #c8e2b5;
  }

  .secondary {
    margin-top: 23.077rpx;
    border: 1px solid #dfe5d8;
    background: #fffcf5;
    font-weight: 400;
  }
}
</style>
