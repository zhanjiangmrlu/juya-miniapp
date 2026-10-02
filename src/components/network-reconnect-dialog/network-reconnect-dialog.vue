<script setup lang="ts">
const emit = defineEmits<{
  close: []
  retry: []
}>()

let navigationTop: string | undefined
// #ifdef MP-WEIXIN
const windowInfo = uni.getWindowInfo()
navigationTop = `${(windowInfo.statusBarHeight ?? 20) + (48 * windowInfo.windowWidth) / 390}px`
// #endif

/** 触发页面重新执行身份与首页数据加载 */
const handleRetry = () => {
  emit('retry')
}
/** 关闭本次网络提示并保留当前可阅读内容 */
const handleClose = () => emit('close')
</script>

<template>
  <view
    class="network-dialog"
    :style="navigationTop ? { top: navigationTop } : undefined"
    role="dialog"
    aria-modal="true"
    aria-label="网络异常"
  >
    <view class="dialog-panel">
      <button class="dialog-close" aria-label="关闭网络提示" @click="handleClose">×</button>
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
  inset: tokens.home-size(78) 0
    calc(#{tokens.home-size(57)} + max(#{tokens.home-size(19)}, env(safe-area-inset-bottom))) 0;
  display: grid;
  padding: 0 30px 11px;
  background: rgb(20 37 27 / 43%);
  place-items: center;

  .dialog-panel {
    position: relative;
    width: 100%;
    max-width: 330px;
    padding: 23px 22px 18px;
    border-radius: 18px;
    background: tokens.$home-card;
    text-align: left;
  }

  .dialog-close {
    position: absolute;
    top: 14px;
    right: 13px;
    width: 32px;
    height: 32px;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: tokens.$home-ink;
    font-size: 23px;
    line-height: 32px;

    &::after {
      border: 0;
    }
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
