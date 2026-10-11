<script setup lang="ts">
import { computed } from 'vue'

import previewLock from '@/features/short-reading/assets/preview-lock.svg'
import { ShortReadingAccess } from '@/shared/enums/short-reading'

import type { ShortReadingPreviewProps } from '@/shared/types/short-reading-components'

const props = defineProps<ShortReadingPreviewProps>()
const emit = defineEmits<{ returnToList: [] }>()
/** 仅用重新鉴权后的访问状态提示当前权限，安全预览不自动请求或显示全文 */
const readable = computed(() =>
  (
    [ShortReadingAccess.TRIAL, ShortReadingAccess.FORMAL, ShortReadingAccess.LIMITED] as string[]
  ).includes(props.summary.access)
)
</script>

<template>
  <scroll-view class="preview-scroll" scroll-y>
    <view class="preview-content">
      <view class="preview-card">
        <view class="preview-label"
          ><image
            class="preview-lock"
            :src="previewLock"
            mode="aspectFit"
            aria-hidden="true"
          /><text>内容预览</text></view
        >
        <image
          v-if="summary.cover_url"
          class="safe-cover"
          :src="summary.cover_url"
          mode="aspectFill"
        />
        <text class="preview-title">{{ summary.title_en }}</text>
        <text class="preview-chinese">{{ summary.title_zh }}</text>
        <text class="preview-meta"
          >{{ summary.category }} · {{ summary.topic }} · {{ summary.level }}</text
        >
        <text class="preview-intro">{{ summary.intro }}</text>
        <text v-if="summary.progress_summary?.completed_at" class="preview-progress">已读完</text>
      </view>
      <view class="preview-notice"
        ><text class="notice-title">{{
          readable ? '此短文现已开放阅读' : '当前账号暂未开通此内容'
        }}</text
        ><text>{{
          readable ? '返回短文列表即可打开完整正文。' : '你仍可阅读已开放的短文。'
        }}</text></view
      >
      <button class="return-button" @click="emit('returnToList')">返回短文列表</button>
    </view>
  </scroll-view>
</template>

<style scoped lang="scss">
.preview-scroll {
  height: var(--reading-scroll-height, calc(100vh - 172px));
}

.preview-content {
  display: flex;
  max-width: 632px;
  margin: 0 auto;
  padding: 20px;
  color: #254733;
  flex-direction: column;
  gap: 14px;

  text {
    display: block;
    overflow-wrap: anywhere;
  }

  .preview-card {
    display: flex;
    padding: 20px;
    border: 1px solid #d9e4d2;
    border-radius: 14px;
    background: #fffdf7;
    flex-direction: column;
    gap: 12px;
  }

  .preview-label {
    display: flex;
    align-items: center;
    gap: 12px;

    .preview-lock {
      width: 22px;
      height: 22px;
    }

    text {
      min-width: 118px;
      padding: 5px 14px;
      border-radius: 10px;
      background: #e2eed9;
      color: #4e7f3b;
      font-size: 11px;
      line-height: 18px;
      text-align: center;
    }
  }

  .safe-cover {
    width: 100%;
    height: 160px;
    border-radius: 12px;
  }

  .preview-title {
    font-size: 26px;
    font-weight: 700;
    line-height: 36px;
  }

  .preview-chinese {
    color: #748271;
    font-size: 14px;
    line-height: 22px;
  }

  .preview-meta {
    color: #4e7f3b;
    font-size: 11px;
    line-height: 18px;
  }

  .preview-intro {
    font-size: 14px;
    line-height: 22px;
  }

  .preview-progress {
    color: #4e7f3b;
    font-size: 14px;
    line-height: 22px;
  }

  .preview-notice {
    display: flex;
    padding: 16px;
    border-radius: 16px;
    background: #e2eed9;
    font-size: 14px;
    line-height: 22px;
    flex-direction: column;
    gap: 8px;

    .notice-title {
      color: #4e7f3b;
      font-weight: 500;
    }
  }

  .return-button {
    width: 100%;
    min-height: 46px;
    margin: 0;
    padding: 12px;
    border-radius: 12px;
    background: #4e7f3b;
    color: #fff;
    font-size: 15px;
    line-height: 22px;

    &::after {
      border: 0;
    }
  }
}
</style>
