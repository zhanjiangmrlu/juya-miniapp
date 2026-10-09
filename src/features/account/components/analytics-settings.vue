<script setup lang="ts">
import { onUnmounted, ref } from 'vue'

import { getAnalytics, requestAnalyticsConsent } from '@/services/analytics/runtime'
import { AnalyticsConsent } from '@/shared/enums/analytics'

const analytics = getAnalytics()
const granted = ref(analytics.getConsent() === AnalyticsConsent.GRANTED)
const switchGeneration = ref(0)
const unsubscribe = analytics.subscribe(() => {
  granted.value = analytics.getConsent() === AnalyticsConsent.GRANTED
})
onUnmounted(unsubscribe)

/** 处理用户主动改变统计开关，event 为微信 switch 的布尔选择 */
const change = (event: unknown) => {
  const value = (event as { detail?: { value?: boolean } }).detail?.value
  if (typeof value !== 'boolean') return
  switchGeneration.value++
  if (value) requestAnalyticsConsent()
  else void analytics.setConsent(false)
}
</script>

<template>
  <view class="analytics-settings">
    <view class="setting-row">
      <view class="setting-copy">
        <text class="setting-title">使用情况统计</text>
        <text class="setting-description">{{
          analytics.isAvailable() ? '帮助改进访问和学习体验，可随时关闭' : '当前版本未启用统计'
        }}</text>
      </view>
      <switch
        :key="switchGeneration"
        :checked="granted"
        :disabled="!analytics.isAvailable()"
        color="#617f59"
        aria-label="使用情况统计"
        @change="change"
      />
    </view>
    <text class="privacy-copy"
      >开启后使用友盟随机统计标识及设备、网络和使用行为信息，不上传微信号、昵称、头像或录音。关闭后停止新的统计请求并清除本机统计缓存；已发送的数据不会由此删除。</text
    >
    <text class="privacy-link" selectable>友盟隐私政策：https://www.umeng.com/page/policy</text>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.analytics-settings {
  margin-bottom: 20px;
  padding: 16px;
  border-radius: 16px;
  background: tokens.$home-card;

  .setting-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .setting-copy {
    flex: 1;
    min-width: 0;
  }

  .setting-title,
  .setting-description,
  .privacy-copy,
  .privacy-link {
    display: block;
  }

  .setting-title {
    color: tokens.$home-ink;
    font-size: 16px;
    font-weight: 700;
  }

  .setting-description,
  .privacy-copy,
  .privacy-link {
    margin-top: 8px;
    color: tokens.$color-text-muted;
    font-size: 12px;
    line-height: 19px;
    overflow-wrap: anywhere;
  }
}
</style>
