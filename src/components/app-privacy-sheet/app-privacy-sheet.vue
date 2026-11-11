<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { analytics } from '@/services/analytics'
import { session } from '@/services/api'
import { openPolicy, readingPolicy } from '@/services/consent-coordinator'
import { loginPromptTarget, promptLogin } from '@/services/login-prompt'
import { privacy } from '@/services/privacy'
import { Routes } from '@/shared/constants/navigation'
import { ConsentAction } from '@/shared/enums/privacy'
defineEmits<{ close: [] }>()
const props = defineProps<{ sourceTarget?: string }>()
const error = ref(''),
  busy = ref(false),
  restored = ref(false)
const enabled = computed(
  () =>
    privacy.currentOwner() === session.userId() && privacy.state.value?.analytics.enabled === true
)
onMounted(async () => {
  try {
    await privacy.loadPolicies()
    const user = session.userId()
    if (user) await privacy.restore(user)
    restored.value = true
  } catch {
    // 初始化未完成时保持开关关闭，不将内部状态显示为用户操作错误
  }
})
/** 独立开关先核对账号，拒绝统计不影响必要业务 */
const toggle = async () => {
  if (busy.value) return
  if (!session.userId()) {
    promptLogin(props.sourceTarget || `${Routes.SETTINGS}?privacy=1`, ConsentAction.STATISTICS)
    return
  }
  busy.value = true
  error.value = ''
  try {
    await privacy.choose(!enabled.value)
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '关闭已保留，等待同步'
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <view
    v-show="!loginPromptTarget && !readingPolicy"
    class="veil"
    role="dialog"
    aria-modal="true"
    aria-label="隐私说明"
    @touchmove.stop.prevent
    ><view class="sheet">
      <button class="privacy-button close" aria-label="关闭隐私说明" @click="$emit('close')">
        <image class="close-icon" src="/static/design/consent-close.svg" mode="aspectFit" />
      </button>
      <scroll-view scroll-y class="privacy-text" @touchmove.stop>
        <text class="dialog-title">隐私说明</text>
        <text class="paragraph"
          >游客可直接浏览免费内容，无需创建账号。登录后，通过微信身份识别同一账号，保存学习记录、收藏和打卡。</text
        >
        <text class="paragraph muted">{{ '头像昵称由你主动设置。\n不收集手机号和微信号。' }}</text>
        <view class="policy-list"
          ><button class="privacy-button policy-entry" @click="openPolicy('terms')">
            用户协议<text>›</text></button
          ><button class="privacy-button policy-entry" @click="openPolicy('privacy')">
            隐私保护指引<text>›</text>
          </button></view
        >
        <view class="statistics"
          ><view
            ><text class="section-title">友盟使用统计</text
            ><text class="status">{{
              enabled
                ? analytics.running
                  ? '可选 · 当前已开启'
                  : '已允许 · 当前未运行'
                : '可选 · 当前未开启'
            }}</text></view
          ><button
            class="privacy-button statistics-switch"
            :class="{ enabled }"
            role="switch"
            :aria-checked="enabled"
            aria-label="友盟使用统计"
            :disabled="busy || (!enabled && (!restored || !privacy.published()))"
            @click="toggle"
          >
            <view class="track"><view class="knob" /></view></button
        ></view>
        <text class="paragraph muted"
          >本版真实统计未运行，不装载友盟SDK。许可仅限页面访问、内容打开、播放成功、收藏变更和完成成功五类事件与必要引用，不采集设备型号或自动会话。</text
        >
        <text class="paragraph muted">关闭即停止后续统计，不影响收藏、学习记录和打卡。</text>
        <text v-if="error" class="error" role="alert">{{ error }}</text>
        <button class="privacy-button policy-link" @click="openPolicy('analytics')">
          查看友盟隐私政策
        </button>
        <button class="privacy-button primary" @click="$emit('close')">我知道了</button>
      </scroll-view>
    </view></view
  >
</template>
<style scoped lang="scss">
.veil {
  position: fixed;
  inset: 0;
  z-index: 210;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 46.154rpx;
  background: rgb(43 68 56 / 26%);

  .sheet {
    position: relative;
    text-align: left;
    width: 100%;
    max-width: 657.692rpx;
    padding: 42.308rpx;
    border-radius: 30.769rpx;
    background: #fffcf5;
    box-shadow: 0 23.077rpx 69.231rpx rgb(31 51 40 / 16%);
  }

  .privacy-text {
    height: min(1038rpx, calc(100vh - 180rpx));
    max-height: calc(100vh - 180rpx);
  }

  .privacy-button {
    padding: 0;
    margin: 0;
    min-height: 44px;
    border: 0;
    background: transparent;
    color: #41664d;
    font-size: 25rpx;

    &::after {
      border: 0;
    }
  }

  .close {
    position: absolute;
    z-index: 1;
    right: 17.308rpx;
    top: 23.077rpx;
    width: 44px;
    display: flex;
    align-items: center;
    justify-content: center;

    .close-icon {
      width: 38.462rpx;
      height: 38.462rpx;
    }
  }

  .dialog-title {
    display: block;
    margin: 10rpx 50rpx 30rpx 0;
    text-align: left;
    font-size: 36.538rpx;
    font-weight: 700;
    line-height: 56.635rpx;
    color: #2b4438;
  }

  .paragraph {
    display: block;
    margin-bottom: 20rpx;
    font-size: 25rpx;
    line-height: 44.231rpx;
    color: #2b4438;
    white-space: pre-line;
  }

  .muted {
    color: #586c5b;
    font-size: 23.077rpx;
    line-height: 40.385rpx;
  }

  .policy-list {
    margin: 24rpx 0;
    border-top: 1px solid #dfe5d8;

    .policy-entry {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      border-bottom: 1px solid #dfe5d8;
      border-radius: 0;
    }
  }

  .statistics {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rpx;
  }

  .section-title {
    display: block;
    font-size: 26.923rpx;
    font-weight: 700;
    line-height: 44.231rpx;
  }

  .status {
    display: block;
    color: #586c5b;
    font-size: 21.154rpx;
    line-height: 38.462rpx;
  }

  .statistics-switch {
    width: 50px;
    display: flex;
    align-items: center;
    justify-content: center;

    .track {
      width: 92.308rpx;
      height: 46.154rpx;
      border-radius: 23.077rpx;
      background: #dee4d8;
    }

    .knob {
      margin: 5.769rpx;
      width: 34.615rpx;
      height: 34.615rpx;
      border-radius: 50%;
      background: #fffcf5;
    }
  }

  .enabled .track {
    background: #41664d;
  }

  .enabled .knob {
    margin-left: 51.923rpx;
  }

  .policy-link {
    display: flex;
    justify-content: flex-start;
    width: 100%;
    text-align: left;
    font-size: 23.077rpx;
    text-decoration: underline;
  }

  .error {
    display: block;
    color: #795b2f;
    font-size: 23.077rpx;
    line-height: 40rpx;
  }

  .primary {
    margin-top: 24rpx;
    width: 100%;
    min-height: 46px;
    border-radius: 17.308rpx;
    background: #c8e2b5;
    color: #2b4438;
    font-size: 26.923rpx;
    font-weight: 700;
  }
}
</style>
