<script setup lang="ts">
import { dismissLoginPrompt, loginPromptTarget } from '@/services/login-prompt'
import { openLogin } from '@/services/navigation'
/** 用户确认登录时才冻结来源并进入隐私同意页 */
const login = () => {
  const target = loginPromptTarget.value
  dismissLoginPrompt()
  openLogin(target)
}
</script>
<template>
  <view
    v-if="loginPromptTarget"
    class="login-prompt"
    role="dialog"
    aria-modal="true"
    aria-label="登录后保存到你的账号"
    @touchmove.stop.prevent
  >
    <view class="dialog">
      <text class="title">登录后保存到你的账号</text>
      <text class="copy">收藏、学习记录和打卡需要账号同步。也可以继续浏览免费内容。</text>
      <button class="primary" @click="login">登录</button>
      <button class="secondary" @click="dismissLoginPrompt">继续浏览</button>
    </view>
  </view>
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
