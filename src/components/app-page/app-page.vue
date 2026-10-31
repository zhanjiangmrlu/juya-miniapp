<script setup lang="ts">
import { onHide, onShow } from '@dcloudio/uni-app'
import { computed, ref, watch } from 'vue'

import ShareSummary from '@/features/share/components/share-summary.vue'
import { setShareMenu } from '@/services/native-share'
import { backTo } from '@/services/navigation'
import { pageBackgroundURL } from '@/services/page-backgrounds'
import { remoteFontStyles } from '@/services/remote-fonts'
import { runtimeMode } from '@/services/runtime-mode'
import { PageBackgroundKind } from '@/shared/enums/ui'

import type { ShareMenuChannels } from '@/shared/types/share'
const props = withDefaults(
  defineProps<{
    fixedViewport?: boolean
    title: string
    backgroundImage?: string
    backgroundKind?: PageBackgroundKind
    back?: boolean
    footer?: boolean
    fallback?: string
    customBack?: boolean
    shareable?: boolean
    shareChannels?: ShareMenuChannels
    publicSummary?: boolean
  }>(),
  {
    fixedViewport: false,
    back: false,
    footer: false,
    fallback: undefined,
    customBack: false,
    shareChannels: undefined,
    backgroundImage: undefined,
    backgroundKind: undefined
  }
)
const artworkFailed = ref(false),
  paperFailed = ref(false)
const artwork = computed(() =>
  props.backgroundKind ? pageBackgroundURL(props.backgroundKind) : ''
)
const paper = computed(() =>
  props.backgroundKind && !paperFailed.value ? pageBackgroundURL(PageBackgroundKind.PAPER) : ''
)
watch(
  () => props.backgroundKind,
  () => {
    artworkFailed.value = false
    paperFailed.value = false
  }
)
const emit = defineEmits<{ back: [] }>()
const browseOnly = runtimeMode.browseOnly
let visible = false
onShow(() => {
  visible = true
  // 同步原生窗口的上下回弹区和安全区，避免真机露出默认白底
  // #ifdef MP-WEIXIN
  uni.setBackgroundColor?.({
    backgroundColor: '#fffcf5',
    backgroundColorTop: '#fffcf5',
    backgroundColorBottom: '#fffcf5'
  })
  // #endif
  setShareMenu(props.shareable ? props.shareChannels || true : false)
})
onHide(() => {
  visible = false
  setShareMenu(false)
})
watch(
  () => [
    props.shareable,
    props.shareChannels?.friends,
    props.shareChannels?.timeline,
    browseOnly.value
  ],
  () => {
    if (visible) setShareMenu(props.shareable ? props.shareChannels || true : false)
  }
)
const info = typeof uni.getWindowInfo === 'function' ? uni.getWindowInfo() : uni.getSystemInfoSync()
let top = 32,
  right = 0,
  nav = 56
// #ifdef MP-WEIXIN
const capsule = uni.getMenuButtonBoundingClientRect()
top = info.statusBarHeight || 20
right = info.windowWidth - capsule.left + 8
nav = Math.max(44, capsule.bottom - top + 8)
// #endif
const headingStyle = computed(() => ({
  paddingTop: `${top}px`,
  paddingRight: `${right}px`,
  minHeight: `${top + nav}px`
}))
/** 二级页面默认返回实际来源，编辑页可接管未保存确认 */
const goBack = () => {
  if (props.customBack) emit('back')
  else backTo(props.fallback)
}
</script>
<template>
  <view
    class="app-page"
    :class="{
      'has-footer': footer,
      'has-background': backgroundImage || backgroundKind,
      'fixed-viewport': fixedViewport
    }"
    :style="{
      ...remoteFontStyles,
      '--page-header-height': `${top + nav}px`,
      backgroundImage: paper ? `url(${paper})` : undefined
    }"
    ><image
      v-if="backgroundImage"
      class="page-background"
      :src="backgroundImage"
      mode="aspectFill"
      aria-hidden="true" /><image
      v-if="artwork && !artworkFailed"
      class="page-artwork"
      :src="artwork"
      mode="widthFix"
      aria-hidden="true"
      @error="artworkFailed = true" /><image
      v-if="paper"
      class="paper-probe"
      :src="paper"
      aria-hidden="true"
      @error="paperFailed = true" /><view class="page-nav" :style="headingStyle"
      ><button v-if="back && !browseOnly" class="back-button" aria-label="返回" @click="goBack">
        <image
          class="back-icon"
          src="/static/design/back.svg"
          mode="aspectFit"
          aria-hidden="true"
        /></button
      ><view v-if="title === '句芽英语' && !browseOnly" class="nav-brand"
        ><text class="nav-wordmark">juya</text><text>句芽英语</text></view
      ><text v-else class="nav-title">{{ browseOnly ? '分享摘要' : title }}</text
      ><view v-if="!browseOnly" class="nav-action"><slot name="action" /></view></view
    ><view class="page-body"
      ><template v-if="browseOnly && (!publicSummary || fixedViewport)">
        <scroll-view v-if="fixedViewport" class="summary-scroll" scroll-y
          ><ShareSummary
        /></scroll-view>
        <ShareSummary v-else /> </template
      ><slot v-else /></view
    ><slot v-if="!browseOnly" name="footer"
  /></view>
</template>
<style scoped lang="scss">
.app-page {
  position: relative;
  min-height: 100vh;
  background: #fffcf5;
  background-size: 100% auto;
  background-repeat: repeat-y;

  &.fixed-viewport {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;

    .summary-scroll {
      flex: 1;
      height: 0;
      min-height: 0;
    }

    .page-nav {
      flex-shrink: 0;
    }

    .page-body {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
      padding-bottom: max(53.846rpx, env(safe-area-inset-bottom));
    }
  }

  &.has-footer {
    padding-bottom: calc(190rpx + env(safe-area-inset-bottom));
  }

  &.has-background {
    .page-nav {
      background: transparent;
    }
  }
}

.page-artwork {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  pointer-events: none;
}

.paper-probe {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.page-background {
  position: fixed;
  z-index: 0;
  inset: 0;
  width: 100%;
  height: 100vh;
  pointer-events: none;
}

.page-nav {
  position: sticky;
  top: 0;
  z-index: 15;
  display: flex;
  align-items: center;
  padding-left: 46.154rpx;
  background: #fffcf5;

  .nav-brand {
    display: flex;
    align-items: center;
    gap: 21.154rpx;
    font-size: 26.923rpx;
    font-weight: 500;
    line-height: 41.731rpx;
  }

  .nav-wordmark {
    font-family: var(--app-serif-italic-font, Fraunces, Georgia, serif);
    font-size: 51.923rpx;
    font-style: italic;
    font-weight: 400;
    line-height: 84.615rpx;
    letter-spacing: -0.035em;
  }

  .nav-title {
    font-size: 28.846rpx;
    font-weight: 500;
    line-height: 44.712rpx;
  }

  .back-button {
    width: 50rpx;
    height: 76.923rpx;
    margin-right: 15.385rpx;
    padding: 0;
    border: 0;
    background: none;

    .back-icon {
      width: 42.308rpx;
      height: 42.308rpx;
    }
  }

  .nav-action {
    margin-left: auto;
    padding-right: 30.769rpx;
  }
}

.page-body {
  position: relative;
  padding: 46.154rpx 46.154rpx 53.846rpx;
}
</style>
