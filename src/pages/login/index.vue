<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'

import AppPage from '@/components/app-page/app-page.vue'
import AppPrivacySheet from '@/components/app-privacy-sheet/app-privacy-sheet.vue'
import { openTarget, safeTarget } from '@/services/navigation'
import { Routes } from '@/shared/constants/navigation'
import { useAccountStore } from '@/stores/account-store'

import type { ConsentChangeEvent } from '@/shared/types/ui'
const account = useAccountStore(),
  agreed = ref(false),
  busy = ref(false),
  error = ref(''),
  privacy = ref(false)
let target: string = Routes.LEARNING
/** 用户主动同意后登录，失败不改变页面身份 */
const login = async () => {
  if (busy.value) return
  if (!agreed.value) {
    error.value = '请先阅读并同意隐私说明'
    return
  }
  busy.value = true
  error.value = ''
  try {
    await account.login(agreed.value)
    openTarget(target)
  } catch (reason) {
    error.value = target.includes('target=')
      ? '登录未成功，分享目标已保留，请重试。'
      : reason instanceof Error
        ? reason.message
        : '登录暂未成功，请重试'
  } finally {
    busy.value = false
  }
}
/** 只保存用户当前的明确勾选
 * @param event 平台勾选结果
 */
const consent = (event: ConsentChangeEvent) => {
  agreed.value = event.detail.value.includes('agree')
}
onLoad((query) => {
  if (query?.return) {
    try {
      target = safeTarget(decodeURIComponent(String(query.return)))
    } catch {
      target = Routes.LEARNING
    }
  }
})
</script>
<template>
  <AppPage title="句芽英语" class="login-screen">
    <view class="login-layout">
      <view class="login-brand">
        <image
          class="login-botanical"
          src="/static/brand/u00-botanical-watercolor@3x.png"
          mode="aspectFit"
          aria-hidden="true"
        />
        <image
          class="login-wordmark"
          src="/static/brand/juya-wordmark@3x.png"
          mode="aspectFit"
          role="img"
          aria-label="juya"
        />
        <image
          class="login-name"
          src="/static/brand/juya-chinese@3x.png"
          mode="aspectFit"
          role="img"
          aria-label="句芽英语"
        />
        <image
          class="login-tagline"
          src="/static/brand/juya-tagline@3x.png"
          mode="aspectFit"
          role="img"
          aria-label="在真实场景里，不再孤立记单词"
        />
      </view>
      <view class="login-card">
        <view class="login-lead">
          <text class="login-title">登录，留住每一次进步</text>
          <text class="login-description">1500+张场景学习，覆盖约2w左右词汇和语块</text>
        </view>
        <view v-if="error" class="notice login-error" role="alert">{{ error }}</view>
        <view class="consent-row">
          <checkbox-group @change="consent">
            <label class="consent">
              <checkbox value="agree" :checked="agreed" color="#586c5b" :disabled="busy" />
              <text>我已阅读并同意</text>
            </label>
          </checkbox-group>
          <button class="privacy-link" hover-class="privacy-pressed" @click="privacy = true">
            隐私说明
          </button>
        </view>
        <button class="primary" :disabled="busy" :loading="busy" @click="login">
          {{ busy ? '登录中…' : '同意并登录' }}
        </button>
      </view>
      <text class="login-bottom">{{
        '主动登录后创建或使用你的账号\n学习、收藏与打卡保存在同一账号'
      }}</text>
    </view>
    <AppPrivacySheet v-if="privacy" @close="privacy = false" />
  </AppPage>
</template>
<style scoped lang="scss">
.login-screen {
  display: flex;
  flex-direction: column;
  background: #fffcf7;

  :deep(.page-body) {
    display: flex;
    flex: 1;
    padding: 0;
  }

  :deep(.page-nav) {
    background: #fffcf7;
  }
}

.login-layout {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: calc(100vh - var(--page-header-height));
  padding: 0 34.62rpx 38.46rpx;
}

.login-brand {
  position: relative;
  isolation: isolate;
  display: flex;
  flex: 1 0 500rpx;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 500rpx;
  padding: 46.15rpx 0 51.92rpx;

  .login-botanical {
    position: absolute;
    z-index: 0;
    top: 0;
    left: -34.62rpx;
    width: calc(100% + 69.24rpx);
    height: 100%;
    pointer-events: none;
  }

  .login-wordmark {
    position: relative;
    z-index: 1;
    flex: none;
    width: 243.48rpx;
    height: 215.38rpx;
  }

  .login-name {
    position: relative;
    z-index: 1;
    flex: none;
    width: 223.08rpx;
    height: 84.62rpx;
  }

  .login-tagline {
    position: relative;
    z-index: 1;
    top: -11.54rpx;
    flex: none;
    width: 398.08rpx;
    height: 50rpx;
    margin-top: 23.08rpx;
  }
}

.login-card {
  flex: none;
  padding: 46.15rpx 34.62rpx 23.08rpx;
  border-radius: 38.46rpx;
  background: #fff;
  box-shadow: none;

  .primary {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 96.15rpx;
    margin: 0;
    padding: 23.08rpx 26.92rpx;
    border: 1px solid #cde5b9;
    border-radius: 23.08rpx;
    background: #cde5b9;
    color: #2b4438;
    font-size: 30.77rpx;
    font-weight: 500;
    line-height: 46.15rpx;

    &::after {
      border: 0;
    }

    &[disabled] {
      border-color: #e4efdc;
      background: #e4efdc;
      color: #586c5b;
      opacity: 1;
    }
  }

  .login-error {
    margin-bottom: 26.92rpx;
    padding: 23.08rpx;
    background: #f8edc4;
    color: #795b2f;
    font-size: 23.08rpx;
    line-height: 40.38rpx;
  }
}

.login-lead {
  margin-bottom: 34.62rpx;
  text-align: center;

  .login-title {
    display: block;
    margin-bottom: 19.23rpx;
    font-size: 36.54rpx;
    font-weight: 500;
    line-height: 59.62rpx;
  }

  .login-description {
    display: block;
    color: #586c5b;
    font-size: 24.038rpx;
    line-height: 42.31rpx;
  }
}

.consent-row {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 84.62rpx;
  margin-bottom: 23.08rpx;
  font-size: 23.08rpx;
  line-height: 42.31rpx;

  .privacy-link {
    color: #41664d;
    text-decoration: underline;
    text-underline-offset: 7.692rpx;
    min-height: 84.62rpx;
    margin: 0;
    padding: 0 3.85rpx;
    border: 0;
    background: none;
    font-size: 23.08rpx;
    font-weight: 400;
    line-height: 42.31rpx;

    &::after {
      border: 0;
    }

    &.privacy-pressed,
    &:active {
      background: #e4f0db;
      color: #2b4438;
    }
  }
}

.consent {
  display: flex;
  align-items: center;
  font-size: 23.08rpx;
  line-height: 42.31rpx;

  :deep(.uni-checkbox-input) {
    border-color: #586c5b;
    border-radius: 3px;
  }

  checkbox {
    width: 50rpx;
    margin-right: 9.62rpx;
    transform: scale(0.75);
    transform-origin: center;
  }
}

.login-bottom {
  flex: none;
  margin: 46.15rpx 0 15.38rpx;
  color: #586c5b;
  font-size: 21.15rpx;
  line-height: 40.38rpx;
  text-align: center;
  white-space: pre-line;
}
</style>
