<script setup lang="ts">
const emit = defineEmits<{
  close: []
  retry: []
}>()

let statusBarHeight = 30
// #ifdef MP-WEIXIN
statusBarHeight = uni.getWindowInfo().statusBarHeight ?? 20
// #endif

/** 触发页面重新执行身份与首页数据加载 */
const handleRetry = () => {
  emit('retry')
}
</script>

<template>
  <view
    class="network-dialog"
    :style="{ top: `${statusBarHeight + 48}px` }"
    role="dialog"
    aria-modal="true"
    aria-label="网络异常"
  >
    <view class="dialog-panel">
      <text class="dialog-title">网络异常</text>
      <text class="dialog-description">首页内容仍可阅读。重新连接后再同步你的学习进度。</text>
      <button class="dialog-retry" @click="handleRetry">重新连接</button>
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.network-dialog {
  position: fixed;
  z-index: 70;
  right: 0;
  bottom: calc(57px + max(19px, env(safe-area-inset-bottom)));
  left: 0;
  display: grid;
  padding: 0 30px 11px;
  background: rgb(20 37 27 / 43%);
  place-items: center;

  .dialog-panel {
    width: 100%;
    max-width: 330px;
    padding: 23px 22px 18px;
    border-radius: 18px;
    background: tokens.$home-card;
    text-align: left;
  }

  .dialog-title,
  .dialog-description {
    display: block;
  }

  .dialog-title {
    height: 31px;
    color: tokens.$home-ink;
    font-size: 19px;
    font-weight: 700;
    line-height: normal;
  }

  .dialog-description {
    min-height: 67px;
    margin-top: 13px;
    color: #617360;
    font-size: 13px;
    line-height: normal;
  }

  .dialog-retry {
    display: flex;
    width: 100%;
    height: 46px;
    align-items: center;
    justify-content: center;
    margin: 15px 0 0;
    padding: 0;
    border: 0;
    border-radius: 11px;
    background: tokens.$home-primary;
    color: tokens.$color-white;
    font-size: 14px;
    font-weight: 500;
    line-height: normal;

    &::after {
      border: 0;
    }
  }
}
</style>
