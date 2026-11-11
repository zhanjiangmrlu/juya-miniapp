<script setup lang="ts">
import { CONSENT_ACTION_COPY } from '@/shared/constants/privacy'
import { ConsentAction } from '@/shared/enums/privacy'

defineProps<{
  first: boolean
  confirmed: boolean
  busy: boolean
  error: string
  action?: ConsentAction
}>()
defineEmits<{ login: [enabled: boolean]; close: []; policy: [kind: string] }>()
</script>
<template>
  <view
    class="consent-veil"
    role="dialog"
    aria-modal="true"
    aria-label="用户协议与隐私保护"
    @touchmove.stop.prevent
  >
    <view
      class="consent-card"
      :class="{ 'is-first': first, 'has-error': !!error, 'is-first-error': first && !!error }"
    >
      <button class="consent-button close" aria-label="关闭，继续游客体验" @click="$emit('close')">
        <image class="close-icon" src="/static/design/consent-close.svg" mode="aspectFit" />
      </button>
      <scroll-view scroll-y class="consent-scroll" @touchmove.stop>
        <text class="title">{{
          first ? '用户协议与隐私保护' : CONSENT_ACTION_COPY[action || ConsentAction.ACCOUNT].title
        }}</text>
        <text class="lead">{{
          first ? '欢迎来到句芽英语。' : '留住喜欢的内容，继续自己的学习。'
        }}</text>
        <view class="policies"
          >请阅读
          <button
            class="consent-button policy-entry"
            :disabled="busy"
            @click="$emit('policy', 'terms')"
          >
            《用户协议》
          </button>
          和
          <button
            class="consent-button policy-entry"
            :disabled="busy"
            @click="$emit('policy', 'privacy')"
          >
            《隐私保护指引》
          </button></view
        >
        <text class="copy">{{
          first
            ? '登录后，我们通过微信身份识别账号，\n为你保存收藏、学习记录和打卡。'
            : '登录后可同步收藏和学习记录。\n暂不登录，也能继续阅读和播放免费内容。'
        }}</text>
        <text v-if="first" class="muted">不收集手机号、微信号；\n头像和昵称由你主动设置。</text>
        <view class="analysis"
          ><text class="section-title">友盟使用统计（可选）</text
          ><text class="muted"
            >许可范围仅含页面访问、内容打开、播放成功、收藏变更和学习完成五类事件与必要引用。本版真实统计未运行，不装载友盟SDK；允许许可不代表已开启。可在设置的隐私说明中撤回。</text
          ><button
            class="consent-button policy-link"
            :disabled="busy"
            @click="$emit('policy', 'analytics')"
          >
            查看友盟隐私政策
          </button></view
        >
        <text v-if="error" class="error" role="alert">{{ error }}</text>
        <button class="consent-button primary" :disabled="busy" @click="$emit('login', true)">
          {{
            busy
              ? '登录中…'
              : action === ConsentAction.STATISTICS
                ? '登录后再选择统计'
                : confirmed
                  ? '登录并允许统计'
                  : '同意并登录，允许统计'
          }}
        </button>
        <button class="consent-button secondary" :disabled="busy" @click="$emit('login', false)">
          {{ confirmed ? '仅登录，不允许统计' : '仅同意协议并登录' }}
        </button>
        <button class="consent-button browse" @click="$emit('close')">暂不登录，先体验</button>
        <text class="foot">{{
          first
            ? '不允许统计，也可正常登录和学习'
            : CONSENT_ACTION_COPY[action || ConsentAction.ACCOUNT].foot
        }}</text>
      </scroll-view>
    </view>
  </view>
</template>
<style scoped lang="scss">
.consent-veil {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 46.154rpx;
  background: rgb(43 68 56 / 26%);

  .consent-card {
    position: relative;
    width: 100%;
    max-width: 657.692rpx;
    padding: 42.308rpx;
    border-radius: 30.769rpx;
    background: #fffcf5;
    box-shadow: 0 23.077rpx 69.231rpx rgb(31 51 40 / 16%);
  }

  .consent-scroll {
    height: 1074rpx;
    max-height: calc(100vh - 180rpx);
  }

  .is-first .consent-scroll {
    height: 1180rpx;
  }

  .has-error .consent-scroll {
    height: 1172rpx;
  }

  .is-first-error .consent-scroll {
    height: 1278rpx;
  }

  .title,
  .lead,
  .copy,
  .muted,
  .section-title,
  .foot,
  .error {
    display: block;
  }

  .title {
    padding: 10rpx 40rpx 0 0;
    font-size: 36.538rpx;
    line-height: 56.635rpx;
    font-weight: 700;
  }

  .lead {
    margin-top: 37rpx;
    color: #586c5b;
    font-size: 26.923rpx;
    line-height: 51.154rpx;
  }

  .copy {
    margin: 35rpx 0 20rpx;
    white-space: pre-line;
    font-size: 26.923rpx;
    line-height: 51.154rpx;
  }

  .muted {
    color: #586c5b;
    font-size: 23.077rpx;
    line-height: 40.385rpx;
    white-space: pre-line;
  }

  .consent-button {
    margin: 0;
    padding: 0;
    border: 0;
    color: #41664d;
    background: transparent;
    font-size: 26.923rpx;
    min-height: 44px;

    &::after {
      border: 0;
    }
  }

  .close {
    position: absolute;
    z-index: 1;
    right: 17.308rpx;
    top: 23.077rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;

    .close-icon {
      width: 38.462rpx;
      height: 38.462rpx;
    }
  }

  .policies {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    margin-top: 12rpx;
    font-size: 25rpx;

    .policy-entry {
      font-size: inherit;
      text-decoration: underline;
    }
  }

  .analysis {
    margin-top: 35rpx;
    padding-top: 24rpx;
    border-top: 1px solid #dfe5d8;
  }

  .section-title {
    margin-bottom: 16rpx;
    font-size: 32.692rpx;
    line-height: 49rpx;
    font-weight: 700;
  }

  .policy-link {
    text-align: left;
    display: flex;
    justify-content: flex-start;
    font-size: 23.077rpx;
    text-decoration: underline;
  }

  .primary,
  .secondary {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 46px;
    border-radius: 17.308rpx;
  }

  .primary {
    margin-top: 28rpx;
    background: #c8e2b5;
    color: #2b4438;
    font-weight: 700;

    &[disabled] {
      opacity: 0.6;
    }
  }

  .secondary {
    margin-top: 17.308rpx;
    border: 1px solid #dfe5d8;
  }

  .browse {
    width: 100%;
    margin-top: 17.308rpx;
  }

  .foot {
    color: #586c5b;
    text-align: center;
    margin-top: 16rpx;
    font-size: 26.923rpx;
    line-height: 51rpx;
  }

  .error {
    padding: 16rpx;
    margin-top: 12rpx;
    border-radius: 14rpx;
    background: #f8edda;
    color: #795b2f;
    font-size: 23.077rpx;
    line-height: 40rpx;
  }
}
</style>
