<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'

import AppLeaf from '@/components/app-leaf/app-leaf.vue'
import AppPrivacySheet from '@/components/app-privacy-sheet/app-privacy-sheet.vue'
import { openTarget } from '@/services/navigation'
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
  busy.value = true
  error.value = ''
  try {
    await account.login(agreed.value)
    openTarget(target)
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '登录暂未成功，请重试'
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
      target = decodeURIComponent(String(query.return))
    } catch {
      target = Routes.LEARNING
    }
  }
})
</script>
<template>
  <view class="login-page"
    ><view class="login-brand"
      ><AppLeaf :size="100" /><text class="brand-name">句芽英语</text
      ><text class="tagline">从真实场景开始，自然开口说英语</text></view
    ><view class="welcome"
      ><text class="title">让每一句，都有用处</text
      ><text class="description">{{
        '看懂场景，听见表达。\n从一张场景卡开始，每天学会一点。'
      }}</text></view
    ><view class="login-actions"
      ><view v-if="error" class="notice error">{{ error }}</view
      ><view class="consent-row"
        ><checkbox-group @change="consent"
          ><label class="consent"
            ><checkbox value="agree" :checked="agreed" color="#347553" :disabled="busy" /><text
              >我已阅读并同意</text
            ></label
          ></checkbox-group
        ><button class="privacy-link" @click="privacy = true">《隐私及用途说明》</button></view
      ><button class="primary" :disabled="busy || !agreed" :loading="busy" @click="login">
        同意并登录</button
      ><text class="footnote">使用微信身份登录，不需要先填写联系方式</text
      ><text class="platform-hint">请在微信小程序中使用微信登录</text></view
    ><AppPrivacySheet v-if="privacy" @close="privacy = false"
  /></view>
</template>
<style scoped lang="scss">
.login-page {
  min-height: 100vh;
  padding: 120rpx 48rpx 60rpx;
  display: flex;
  flex-direction: column;
  background: #fffdf7;
}

.login-brand {
  display: flex;
  flex-direction: column;
  align-items: center;

  .leaf {
    font-size: 104rpx;
    color: #347553;
    line-height: 1;
  }

  .brand-name {
    font-size: 48rpx;
    font-weight: 650;
    color: #347553;
    margin-top: 24rpx;
  }

  .tagline {
    font-size: 24rpx;
    color: #637268;
    margin-top: 14rpx;
  }
}

.welcome {
  margin-top: 100rpx;

  .title {
    font-size: 44rpx;
  }

  .description {
    white-space: pre-line;
    display: block;
    margin-top: 24rpx;
    color: #637268;
    font-size: 28rpx;
    line-height: 1.9;
  }
}

.login-actions {
  margin-top: auto;
  padding-top: 100rpx;

  .primary {
    min-height: 96rpx;
  }

  .footnote,
  .platform-hint {
    display: block;
    text-align: center;
    color: #637268;
    font-size: 22rpx;
    margin-top: 20rpx;
  }

  .platform-hint {
    font-size: 20rpx;
    margin-top: 8rpx;
  }
}

.consent-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 28rpx;

  .privacy-link {
    font-size: 22rpx;
    padding: 0;
    border: 0;
    background: none;
    color: #347553;
  }
}

.consent {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  font-size: 22rpx;

  checkbox {
    transform: scale(0.72);
    transform-origin: left center;
    width: 48rpx;
  }
}
</style>
