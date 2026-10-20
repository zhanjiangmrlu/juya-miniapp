<script setup lang="ts">
defineEmits<{ close: [] }>()
</script>
<template>
  <view class="veil" @touchmove.stop.prevent
    ><view class="sheet"
      ><text class="dialog-title">隐私说明</text
      ><scroll-view scroll-y class="privacy-text"
        ><text class="paragraph final-paragraph"
          >微信身份用于识别同一账号，保存学习记录和收藏。手机号、微信号在账号资料页自愿填写，不填写也可学习。头像昵称由你主动设置，不会自动读取。此处为原型用途说明，正式上线使用正式隐私政策。</text
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
  background: #2b4438;
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
      text-align: center;
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
