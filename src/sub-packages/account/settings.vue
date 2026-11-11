<script setup lang="ts">
import { onLoad, onPageScroll, onShow, onUnload } from '@dcloudio/uni-app'
import { nextTick, ref } from 'vue'

import AppPage from '@/components/app-page/app-page.vue'
import AppPrivacySheet from '@/components/app-privacy-sheet/app-privacy-sheet.vue'
import { openPolicy } from '@/services/consent-coordinator'
import { loginReturn } from '@/services/login-return'
import { Routes } from '@/shared/constants/navigation'
import { PageBackgroundKind } from '@/shared/enums/ui'

const privacyOpen = ref(false)
let scroll = 0
/** 登录或政策阅读返回时恢复原位置和原隐私说明，不执行统计操作 */
const restore = async () => {
  const snapshot = loginReturn.take(Routes.SETTINGS)
  if (!snapshot) return
  privacyOpen.value = snapshot.tab === 'privacy'
  scroll = snapshot.scroll
  await nextTick()
  uni.pageScrollTo({ scrollTop: scroll, duration: 0 })
}
const unregister = loginReturn.register(
  Routes.SETTINGS,
  () => ({
    page: Routes.SETTINGS,
    type: 'page',
    id: '',
    tab: privacyOpen.value ? 'privacy' : '',
    category: '',
    scroll,
    translation: false,
    audioPosition: 0,
    playbackRate: 1,
    version: ''
  }),
  () => {
    void restore()
  }
)
onLoad((query) => {
  privacyOpen.value = query?.privacy === '1'
})
onPageScroll((event) => {
  scroll = event.scrollTop
})
onShow(() => {
  void restore()
})
onUnload(unregister)
</script>
<template>
  <AppPage
    title="设置"
    back
    :fallback="Routes.PROFILE"
    :background-kind="PageBackgroundKind.PROFILE"
    :shareable="false"
  >
    <view class="settings-content">
      <text class="hint">查看协议与隐私保护说明。</text>
      <view class="settings-list">
        <button class="settings-row" data-action="terms" @click="openPolicy('terms')">
          用户协议
        </button>
        <button class="settings-row" data-action="privacy" @click="privacyOpen = true">
          隐私说明
        </button>
      </view>
      <text class="hint">无需登录即可查看。使用统计可在隐私说明中选择或关闭。</text>
    </view>
    <AppPrivacySheet
      v-if="privacyOpen"
      :source-target="`${Routes.SETTINGS}?privacy=1&source=profile`"
      @close="privacyOpen = false"
    />
  </AppPage>
</template>
<style scoped lang="scss">
.settings-content {
  padding: 88.462rpx 46.154rpx;

  .hint {
    display: block;
    color: #586c5b;
    font-size: 23.077rpx;
    line-height: 43.846rpx;
  }

  .settings-list {
    margin: 46.154rpx 0;
    border-top: 1px solid #dfe5d8;
  }

  .settings-row {
    display: flex;
    align-items: center;
    width: 100%;
    min-height: 56px;
    padding: 20rpx 0;
    margin: 0;
    border: 0;
    border-bottom: 1px solid #dfe5d8;
    border-radius: 0;
    color: #2b4438;
    background: transparent;
    text-align: left;
    font-size: 30.769rpx;
    line-height: 46.154rpx;

    &::after {
      border: 0;
    }
  }
}
</style>
