<script setup lang="ts">
import { computed } from 'vue'

import { resourceURL } from '@/services/platform'
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_IMAGE_LIMIT,
  FEEDBACK_TEXT_LIMIT
} from '@/shared/constants/feedback'
import { FeedbackUploadStatus } from '@/shared/enums/feedback'

import type { FeedbackComposerProps } from '@/shared/types/feedback-components'
const props = withDefaults(defineProps<FeedbackComposerProps>(), {
  supplement: false,
  editable: true
})
defineEmits<{ submit: [] }>()
const disabled = computed(
  () =>
    !props.editable ||
    !props.draft.active.value ||
    props.draft.busy.value ||
    (props.draft.unknown.value && !props.draft.refill.value)
)
/** 平台输入保留原文，仅在提交前按Unicode字符校验
 * @param event 输入框本次原始文本
 */
const input = (event: Event) => {
  const detail = (event as Event & { detail?: { value?: string } }).detail
  if (!disabled.value)
    props.draft.updateText(
      detail?.value ?? (event.target as HTMLTextAreaElement | null)?.value ?? ''
    )
}
/** 只选择剩余数量的截图，上传结果由各附件独立管理 */
const chooseImages = () => {
  if (disabled.value || props.draft.uploading.value) return
  uni.chooseImage({
    count: FEEDBACK_IMAGE_LIMIT - props.draft.images.value.length,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (result) => {
      void props.draft.addImages(result.tempFilePaths as string[])
    }
  })
}
/** 私有授权过期时重新取地址再预览，不重复上传成功图片
 * @param key 已上传截图的本地标识
 */
const preview = async (key: string) => {
  const value = await props.draft.renew(key)
  if (value) uni.previewImage({ urls: [resourceURL(value.url)] })
}
</script>
<template>
  <view class="feedback-composer">
    <template v-if="!supplement">
      <text class="field-label">问题分类</text>
      <view class="category-grid">
        <button
          v-for="item in FEEDBACK_CATEGORIES"
          :key="item.value"
          :disabled="disabled"
          :class="{ selected: draft.category.value === item.value }"
          @click="draft.selectCategory(item.value)"
        >
          {{ item.label }}
        </button>
      </view>
    </template>
    <text class="field-label">{{ supplement ? '补充说明' : '问题描述' }}</text>
    <textarea
      :value="draft.text.value"
      :maxlength="-1"
      :disabled="disabled"
      placeholder="请说明遇到的问题，方便我们核对。"
      @input="input"
    />
    <text class="character-count" :class="{ invalid: draft.count.value > FEEDBACK_TEXT_LIMIT }"
      >{{ draft.count.value }} / {{ FEEDBACK_TEXT_LIMIT }}</text
    >
    <view class="attachment-grid">
      <view v-for="(item, index) in draft.images.value" :key="item.key" class="attachment">
        <button
          class="attachment-image"
          :aria-label="`查看截图${index + 1}`"
          :disabled="!item.image || !draft.active.value"
          @click="preview(item.key)"
        >
          <image :src="item.path" mode="aspectFill" /><text
            v-if="item.status === FeedbackUploadStatus.UPLOADING"
            >上传中…</text
          >
        </button>
        <button
          class="remove"
          :disabled="disabled || draft.uploading.value"
          :aria-label="`移除截图${index + 1}`"
          @click="draft.remove(item.key)"
        >
          <image src="/static/design/dictionary-close.svg" mode="aspectFit" />
        </button>
        <text v-if="item.error" class="attachment-error">{{ item.error }}</text>
        <button
          v-if="item.status === FeedbackUploadStatus.ERROR"
          class="text-button retry"
          :disabled="disabled"
          @click="draft.upload(item.key)"
        >
          重试上传
        </button>
        <button
          v-else-if="item.error && item.image"
          class="text-button retry"
          :disabled="!draft.active.value"
          @click="preview(item.key)"
        >
          重新获取截图
        </button>
      </view>
      <button
        v-if="draft.images.value.length < FEEDBACK_IMAGE_LIMIT"
        class="attach-button"
        :disabled="disabled || draft.uploading.value"
        @click="chooseImages"
      >
        <image src="/static/design/feedback-plus.svg" mode="aspectFit" aria-hidden="true" />添加截图
      </button>
    </view>
    <text class="attachment-help">可选 0—3 张截图</text>
    <view v-if="draft.error.value" class="feedback-error" role="alert"
      ><image src="/static/design/feedback-error.svg" mode="aspectFit" aria-hidden="true" /><text>{{
        draft.error.value
      }}</text></view
    >
    <button
      class="primary submit"
      :loading="draft.busy.value"
      :disabled="draft.busy.value || draft.uploading.value || !draft.active.value || !editable"
      @click="$emit('submit')"
    >
      {{
        draft.busy.value
          ? '正在提交…'
          : draft.refill.value
            ? '以原操作标识确认提交'
            : draft.unknown.value
              ? draft.retryOriginal.value
                ? '重试原提交'
                : '查询提交结果'
              : supplement
                ? '提交补充'
                : '提交反馈'
      }}
    </button>
  </view>
</template>
<style scoped lang="scss">
.feedback-composer {
  .field-label {
    display: block;
    font-size: 28.846rpx;
    line-height: 47.596rpx;
    font-weight: 500;
    margin-bottom: 19.231rpx;
  }

  .category-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 19.231rpx;
    margin-bottom: 46.154rpx;

    button {
      min-height: 84.615rpx;
      padding: 17.308rpx;
      font-size: 26.923rpx;
      border-radius: 19.231rpx;
      line-height: 40.385rpx;
      background: #fffcf5;
    }

    .selected {
      background: #e4f0db;
      border-color: #41664d;
    }
  }

  textarea {
    display: block;
    box-sizing: border-box;
    width: 100%;
    height: 288.462rpx;
    padding: 23.077rpx;
    background: #fff;
    border: 1px solid #dfe5d8;
    border-radius: 19.231rpx;
    font-size: 28.846rpx;
    line-height: 46.154rpx;
    color: #2b4438;
  }

  .character-count {
    display: block;
    text-align: right;
    font-size: 23.077rpx;
    line-height: 38.077rpx;
    margin-top: 11.538rpx;
    color: #586c5b;

    &.invalid {
      color: #ad4f32;
    }
  }

  .attachment-grid {
    display: flex;
    gap: 19.231rpx;
    flex-wrap: wrap;
    align-items: flex-start;
    margin-top: 30.769rpx;
  }

  .attachment {
    position: relative;
    width: 150rpx;

    .attachment-error {
      display: block;
      font-size: 21.154rpx;
      color: #ad4f32;
      overflow-wrap: anywhere;
    }

    .retry {
      font-size: 21.154rpx;
      padding: 7.692rpx 0;
    }
  }

  .attachment-image {
    position: relative;
    padding: 0;
    width: 150rpx;
    height: 150rpx;
    border-radius: 9.615rpx;
    overflow: hidden;

    image {
      width: 150rpx;
      height: 150rpx;
    }

    text {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      background: #fffcf5;
      font-size: 19.231rpx;
    }
  }

  .remove {
    position: absolute;
    right: 0;
    top: 0;
    padding: 0;
    width: 53.846rpx;
    height: 53.846rpx;
    background: #fffcf5;
    border-radius: 0 8rpx;
    display: flex;
    align-items: center;
    justify-content: center;

    image {
      width: 38.462rpx;
      height: 38.462rpx;
    }
  }

  .attach-button {
    min-height: 88.462rpx;
    display: flex;
    gap: 13.462rpx;
    align-items: center;
    padding: 23.077rpx;
    font-size: 25rpx;
    line-height: 37.5rpx;
    border-radius: 19.231rpx;
    background: #fffcf5;

    image {
      width: 38.462rpx;
      height: 38.462rpx;
    }
  }

  .attachment-help {
    display: block;
    font-size: 23.077rpx;
    line-height: 41.538rpx;
    margin-top: 13.462rpx;
    color: #586c5b;
  }

  .feedback-error {
    display: flex;
    gap: 15.385rpx;
    align-items: flex-start;
    padding: 23.077rpx 25rpx;
    margin-top: 24.038rpx;
    background: #fbece3;
    border-radius: 17.308rpx;
    color: #97442d;
    font-size: 23.077rpx;
    line-height: 42.692rpx;

    image {
      width: 30.769rpx;
      height: 30.769rpx;
      flex-shrink: 0;
      margin-top: 5.769rpx;
    }
  }

  .submit {
    width: 100%;
    margin-top: 13.462rpx;
    min-height: 76.923rpx;
    font-size: 26.923rpx;
    padding: 15.385rpx;
  }
}
</style>
