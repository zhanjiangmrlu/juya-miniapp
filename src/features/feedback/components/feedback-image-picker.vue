<script setup lang="ts">
import { ref } from 'vue'

import { chooseFeedbackScreenshot } from '@/features/feedback/screenshot-picker'

import type {
  FeedbackImagePickerEmits,
  FeedbackImagePickerProps
} from '@/shared/types/feedback-components'
defineProps<FeedbackImagePickerProps>()
const emit = defineEmits<FeedbackImagePickerEmits>()
const error = ref('')
/** 选择单张压缩图片并校验格式和体积 */
const choose = () =>
  chooseFeedbackScreenshot(
    (file) => {
      error.value = ''
      emit('select', file)
    },
    (message) => {
      error.value = message
    }
  )
</script>
<template>
  <view class="feedback-image-picker"
    ><view v-if="image" class="selected-image"
      ><image class="screenshot-preview" :src="image.path" mode="aspectFit" /><button
        class="screenshot-remove"
        @click="emit('select', undefined)"
      >
        删除截图
      </button></view
    ><button v-else class="form-field" @click="choose">可添加 1 张截图</button
    ><text v-if="error" class="form-error">{{ error }}</text></view
  >
</template>
<style scoped lang="scss">
@use '../../profile/personal';

.feedback-image-picker {
  margin-top: 8px;

  .form-field {
    margin: 0;
    color: #7a8978;
    text-align: left;
  }

  .selected-image {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 13px;
    border: 1px solid #d6dfc9;
    border-radius: 11px;
    background: #fffdf7;

    .screenshot-preview {
      width: 60px;
      height: 60px;
    }

    .screenshot-remove {
      margin: 0;
      padding: 0;
      background: transparent;
      color: #b4462d;
      font-size: 11px;
    }
  }
}
</style>
