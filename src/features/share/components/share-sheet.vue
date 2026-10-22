<script setup lang="ts">
import { computed, ref } from 'vue'

import { ShareChannel } from '@/shared/enums/share'

import type { FriendsShare, TimelineShare } from '@/shared/types/share'

const props = defineProps<{ friends: FriendsShare; timeline: TimelineShare; scene?: boolean }>()
defineEmits<{ close: [] }>()
const channel = ref<ShareChannel>(ShareChannel.FRIENDS),
  guidance = ref(false)
const preview = computed(() =>
  channel.value === ShareChannel.FRIENDS ? props.friends : props.timeline
)
/** 切换原生分享渠道并收起上一渠道的操作说明
 * @param value 用户当前选择的好友或朋友圈渠道
 */
const selectChannel = (value: ShareChannel) => {
  channel.value = value
  guidance.value = false
}
</script>
<template>
  <view class="share-veil" @click.self="$emit('close')">
    <view
      class="share-sheet"
      role="dialog"
      aria-modal="true"
      :aria-label="scene ? '分享场景' : '分享学习页'"
      @click.stop
    >
      <view class="share-heading"
        ><text>{{ scene ? '分享场景' : '分享学习页' }}</text
        ><button class="close" aria-label="关闭分享" @click="$emit('close')">
          <image
            class="close-icon"
            src="/static/design/dictionary-close.svg"
            mode="aspectFit"
          /></button
      ></view>
      <view class="share-channels"
        ><button
          class="channel-button"
          :class="{ active: channel === ShareChannel.FRIENDS }"
          @click="selectChannel(ShareChannel.FRIENDS)"
        >
          好友 / 群</button
        ><button
          class="channel-button"
          :class="{ active: channel === ShareChannel.TIMELINE }"
          @click="selectChannel(ShareChannel.TIMELINE)"
        >
          朋友圈
        </button></view
      >
      <view class="share-preview"
        ><image
          class="preview-image"
          :class="{ square: channel === ShareChannel.TIMELINE }"
          :src="preview.imageUrl"
          mode="aspectFit"
          alt="公开分享封面"
        /><text>{{ preview.title }}</text></view
      >
      <text class="share-help">{{
        channel === ShareChannel.FRIENDS
          ? '使用微信原生分享菜单发送给好友或群。'
          : '朋友圈先展示摘要，打开完整小程序后继续。'
      }}</text>
      <!-- #ifdef MP-WEIXIN -->
      <button v-if="channel === ShareChannel.FRIENDS" class="primary" open-type="share">
        发送给好友或群
      </button>
      <button v-else class="primary" @click="guidance = true">从右上角菜单分享</button>
      <!-- #endif -->
      <!-- #ifndef MP-WEIXIN -->
      <button class="primary" @click="guidance = true">在微信小程序内分享</button>
      <!-- #endif -->
      <text v-if="guidance" class="share-help" role="status"
        >请在微信小程序中点击右上角“…”菜单，选择{{
          channel === ShareChannel.TIMELINE ? '“分享到朋友圈”' : '“转发”'
        }}。可用入口以当前微信版本为准。</text
      >
    </view>
  </view>
</template>
<style scoped lang="scss">
.share-veil {
  position: fixed;
  z-index: 80;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48.077rpx;
  background: rgb(43 68 56 / 30%);
}

.share-sheet {
  width: 653.846rpx;
  max-width: 100%;
  max-height: 88vh;
  overflow-y: auto;
  padding: 42.308rpx;
  border-radius: 26.923rpx;
  background: #fffcf5;

  .share-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 84.615rpx;
    font-size: 36.538rpx;
    font-weight: 500;
    line-height: 58.462rpx;

    .close {
      width: 84.615rpx;
      min-height: 84.615rpx;
      margin: 0 -23.077rpx 0 0;
      padding: 23.077rpx;
      border: 0;
      background: none;
    }
  }

  .share-channels {
    display: flex;
    margin-top: 34.615rpx;
    border-bottom: 1px solid #dfe5d8;

    button {
      flex: 1;
      min-height: 90.385rpx;
      padding: 26.923rpx 0;
      border: 0;
      border-radius: 0;
      background: none;
      font-size: 23.077rpx;
      font-weight: 700;
      line-height: 36.923rpx;
    }
  }

  .share-preview {
    overflow: hidden;
    margin-top: 34.615rpx;
    border: 1px solid #dfe5d8;
    border-radius: 19.231rpx;
    background: #fff;

    image {
      display: block;
      width: 100%;
      height: 452.308rpx;
    }

    text {
      display: block;
      padding: 23.077rpx 26.923rpx 28.846rpx;
      font-size: 26.923rpx;
      font-weight: 700;
      line-height: 43.077rpx;
      overflow-wrap: anywhere;
    }
  }

  .share-help {
    display: block;
    margin-top: 26.923rpx;
    color: #586c5b;
    font-size: 25rpx;
    line-height: 47.5rpx;
  }

  .close-icon {
    width: 38.462rpx;
    height: 38.462rpx;
  }

  .channel-button.active {
    border-bottom: 2px solid #2b4438;
  }

  .preview-image.square {
    height: 565.385rpx;
  }

  .primary {
    width: 100%;
    min-height: 76.923rpx;
    margin-top: 26.923rpx;
    padding: 15.385rpx;
    font-size: 26.923rpx;
    line-height: 40.385rpx;
  }
}
</style>
