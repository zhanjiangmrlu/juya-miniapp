<script setup lang="ts">
defineEmits<{ close: [] }>()
</script>
<template>
  <view class="veil" @touchmove.stop.prevent
    ><view class="sheet"
      ><view class="between"
        ><text class="section-title">隐私及用途说明</text
        ><button class="close" aria-label="关闭说明" @click="$emit('close')">×</button></view
      ><scroll-view scroll-y class="privacy-text"
        ><text class="paragraph"
          >微信身份用于识别同一学习账号，并同步你的收藏、已学卡片和打卡记录。只有你主动同意并点击登录后，才会进行身份登录。</text
        ><text class="paragraph"
          >头像和昵称只用于展示，你可以稍后主动选择和填写。系统不会自动读取微信头像昵称。</text
        ><text class="paragraph"
          >手机号与微信号均为选填，用于你主动提供的后续联系与服务。手动填写暂不验证归属，不影响学习、收藏或打卡。</text
        ><text class="paragraph"
          >学习记录只在你主动确认完成后产生，播放音频或查看页面不会替你打卡。已有学习成绩不会因卡片下线或删除而清零。</text
        ><text class="paragraph"
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
  background: #17251c66;
  display: flex;
  align-items: flex-end;

  .sheet {
    width: 100%;
    padding: 40rpx 40rpx calc(36rpx + env(safe-area-inset-bottom));
    border-radius: 32rpx 32rpx 0 0;
    background: #fffdf7;

    .section-title {
      margin-bottom: 0;
      font-size: 34rpx;
    }

    .close {
      width: 64rpx;
      height: 64rpx;
      border: 0;
      background: none;
      font-size: 42rpx;
      padding: 0;
    }

    .privacy-text {
      max-height: 58vh;
      margin: 28rpx 0;
    }

    .paragraph {
      display: block;
      color: #637268;
      font-size: 26rpx;
      line-height: 1.9;
      margin-bottom: 24rpx;
    }
  }
}
</style>
