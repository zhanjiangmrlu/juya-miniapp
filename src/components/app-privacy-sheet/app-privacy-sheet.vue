<script setup lang="ts">
defineEmits<{ close: [] }>()
</script>
<template>
  <view class="veil" @touchmove.stop.prevent
    ><view class="sheet"
      ><text class="dialog-title">隐私说明</text
      ><scroll-view scroll-y class="privacy-text"
        ><text class="paragraph"
          >微信身份用于识别同一学习账号，并同步你的收藏、已学卡片和打卡记录。只有你主动同意并点击登录后，才会进行身份登录。</text
        ><text class="paragraph"
          >头像和昵称只用于展示，你可以稍后主动选择和填写。系统不会自动读取微信头像昵称。</text
        ><text class="paragraph"
          >手机号与微信号均为选填，用于你主动提供的后续联系与服务。手动填写暂不验证归属，不影响学习、收藏或打卡。</text
        ><text class="paragraph"
          >学习记录只在你主动确认完成后产生，播放音频或查看页面不会替你打卡。已有学习成绩不会因卡片下线或删除而清零。</text
        ><text class="paragraph final-paragraph"
          >退出登录会清理本机业务会话与个人资料缓存，服务器上的学习记录和收藏会保留。</text
        ></scroll-view
      ><button class="primary" @click="$emit('close')">我知道了</button></view
    ></view
  >
</template>
<style scoped lang="scss">
.veil {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgb(26 40 29 / 36%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 38.46rpx;

  .sheet {
    width: 100%;
    max-width: 653.85rpx;
    max-height: calc(100vh - 92.31rpx);
    padding: 48.08rpx 42.31rpx 42.31rpx;
    border-radius: 26.92rpx;
    background: #fffcf5;

    .dialog-title {
      display: block;
      font-size: 36.54rpx;
      font-weight: 500;
      line-height: 1.6;
      color: #2b4438;
      margin-bottom: 25rpx;
    }

    .privacy-text {
      max-height: 58vh;
    }

    .paragraph {
      display: block;
      color: #586c5b;
      font-size: 23.08rpx;
      line-height: 1.9;
      margin-bottom: 13.46rpx;
    }

    .final-paragraph {
      margin-bottom: 0;
    }

    .primary {
      margin-top: 44.23rpx;
      width: 100%;
      min-height: 80.77rpx;
      font-size: 23.08rpx;
      line-height: 1.6;
      padding: 17.31rpx 13.46rpx;
      border-radius: 19.23rpx;
      color: #2b4438;
      background: #c8e2b5;
      border-color: #c8e2b5;
    }
  }
}
</style>
