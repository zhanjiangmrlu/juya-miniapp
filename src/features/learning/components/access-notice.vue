<script setup lang="ts">
import { onMounted } from 'vue'

import { getAnalytics } from '@/services/analytics/runtime'
import { AnalyticsEvent } from '@/shared/enums/analytics'
import { useModalScrollLock } from '@/shared/use-page-scroll-lock'

import type { AccessNoticeEmits, AccessNoticeProps } from '@/shared/types/learning-components'

useModalScrollLock()
withDefaults(defineProps<AccessNoticeProps>(), { showProfileAction: false })
const emit = defineEmits<AccessNoticeEmits>()
onMounted(() =>
  getAnalytics().track(AnalyticsEvent.ACCESS_NOTICE_VIEW, { entry_source: 'learning' })
)
/** 关闭提示，原页面和滚动位置保持不变 */
const handleClose = () => emit('close')
/** 进入服务端开关允许的联系资料流程 */
const handleProfile = () => emit('profile')
</script>
<template>
  <view
    class="access-notice"
    role="dialog"
    aria-modal="true"
    aria-label="内容访问提示"
    @touchmove.stop.prevent
    @wheel.stop.prevent
  >
    <view class="notice-panel">
      <text class="notice-title">当前账号暂未开通此内容</text>
      <text class="notice-copy">你仍可以继续学习已开放的场景。</text>
      <button class="notice-primary" @click="handleClose">知道了</button>
      <button v-if="showProfileAction" class="notice-secondary" @click="handleProfile">
        前往我的，完善账号资料
      </button>
    </view>
  </view>
</template>
<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.access-notice {
  position: fixed;
  z-index: 60;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 30px;
  background: rgb(20 37 27 / 43%);

  .notice-panel {
    width: 100%;
    max-width: 330px;
    padding: 23px 22px 18px;
    border-radius: 18px;
    background: tokens.$color-card;
    transform: translateY(-6px);
  }

  .notice-title,
  .notice-copy {
    display: block;
    overflow-wrap: anywhere;
  }

  .notice-title {
    font-size: 19px;
    font-weight: 700;
    line-height: 31px;
  }

  .notice-copy {
    min-height: 67px;
    margin-top: 13px;
    color: #617360;
    font-size: 13px;
    line-height: 20px;
  }

  .notice-primary {
    width: 100%;
    min-height: 46px;
    margin: 15px 0 0;
    padding: 0 8px;
    border-radius: 11px;
    background: tokens.$color-primary;
    color: tokens.$color-white;
    font-size: 14px;
    line-height: 46px;
  }

  .notice-secondary {
    margin: 10px 0 0;
    padding: 6px 0;
    background: transparent;
    color: tokens.$color-primary;
    font-size: 12px;
    line-height: 20px;
  }
}
</style>
