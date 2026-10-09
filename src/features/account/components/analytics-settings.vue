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
    <text class="setting-title">
      使用情况统计
      <text v-if="!analytics.isAvailable()" class="setting-status">（未启用）</text>
    </text>
    <switch
      :key="switchGeneration"
      :checked="granted"
      :disabled="!analytics.isAvailable()"
      color="#617f59"
      aria-label="使用情况统计"
      @change="change"
    />
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.analytics-settings {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
  padding: 16px;
  border-radius: 16px;
  background: tokens.$home-card;

  .setting-title {
    flex: 1;
    min-width: 0;
    color: tokens.$home-ink;
    font-size: 16px;
    font-weight: 700;
  }

  .setting-status {
    color: tokens.$color-text-muted;
    font-size: 12px;
    font-weight: 400;
  }
}
</style>
