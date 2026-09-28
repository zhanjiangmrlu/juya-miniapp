<script setup lang="ts">
import { computed, ref } from 'vue'

import AppButton from '@/components/app-button/app-button.vue'
import {
  FEEDBACK_CATEGORIES,
  preserveDraftAfterUploadFailure,
  validateFeedbackDraft
} from '@/features/feedback/feedback-form'
import { uploadFeedbackImage } from '@/features/feedback/upload-service'
import { ApiError } from '@/services/http/types'
import { getRuntimeServices } from '@/services/runtime'
import { navigate } from '@/shared/navigation/navigate'
import { useFeedbackDraftStore } from '@/stores/feedback-draft'

withDefaults(defineProps<{ blocked?: boolean }>(), { blocked: false })

const store = useFeedbackDraftStore()
const error = ref('')
const loading = ref(false)
const categoryIndex = computed(() =>
  Math.max(
    0,
    FEEDBACK_CATEGORIES.findIndex((item) => item.value === store.draft.category)
  )
)
const categoryLabel = computed(
  () => FEEDBACK_CATEGORIES.find((item) => item.value === store.draft.category)?.label
)

/** 从输入事件同步反馈正文，不把敏感原文写入日志。 */
function handleDescriptionInput(event: unknown) {
  store.update({ description: (event as { detail: { value: string } }).detail.value })
}

/** 按选择器索引保存允许的反馈分类。 */
function handleCategoryChange(event: unknown) {
  const index = Number((event as { detail: { value: string } }).detail.value)
  store.update({ category: FEEDBACK_CATEGORIES[index]?.value ?? '' })
}

/** 从图片扩展名推断接口允许的 MIME 类型。 */
function inferMimeType(path: string): string {
  const extension = path.split('.').pop()?.toLocaleLowerCase()
  if (extension === 'png') return 'image/png'
  if (extension === 'webp') return 'image/webp'
  return 'image/jpeg'
}

/** 选择并保存单张本地截图引用，提交成功前不持久化图片内容。 */
function chooseScreenshot() {
  uni.chooseMedia({
    count: 1,
    mediaType: ['image'],
    sizeType: ['compressed'],
    success: (result) => {
      const selected = result.tempFiles[0]
      if (!selected) return
      store.update({
        screenshots: [
          {
            mimeType: inferMimeType(selected.tempFilePath),
            path: selected.tempFilePath,
            size: selected.size
          }
        ]
      })
      error.value = ''
    }
  })
}

/** 删除草稿中的本地截图引用并保留其他表单字段。 */
function removeScreenshot() {
  store.update({ screenshots: [] })
}

/** 校验、上传可选截图并提交反馈；安全拦截仅保留本地草稿供用户编辑。 */
async function submit() {
  const validation = validateFeedbackDraft(store.draft)
  if (!validation.valid || !validation.normalized) {
    error.value = Object.values(validation.errors)[0] ?? '请检查反馈内容'
    return
  }

  loading.value = true
  let screenshotKey: string | undefined
  try {
    const screenshot = validation.normalized.screenshots[0]
    if (screenshot) {
      try {
        screenshotKey = await uploadFeedbackImage(getRuntimeServices().feedback, screenshot)
      } catch {
        store.update(preserveDraftAfterUploadFailure(store.draft))
        error.value = '截图上传失败，文字草稿已保留，可删除截图后重试'
        return
      }
    }
    const created = await getRuntimeServices().feedback.create({
      category: validation.normalized.category,
      description: validation.normalized.description,
      screenshots: screenshotKey ? [screenshotKey] : [],
      source: validation.normalized.source
    })
    store.clear()
    await navigate({ type: 'redirectTo', url: `/pages/feedback/detail?id=${created.id}` })
  } catch (caught) {
    if (caught instanceof ApiError && caught.code === 'FEEDBACK_CONTENT_BLOCKED') {
      await navigate({ type: 'redirectTo', url: '/pages/feedback/content-blocked' })
      return
    }
    error.value = '暂时无法提交，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <view class="feedback-form">
    <view v-if="blocked" class="feedback-form__blocked" role="alert">
      <text class="feedback-form__blocked-title">内容暂时无法提交</text>
      <text>请删除联系方式、网址或交易信息后重试。被拦截内容不会保存到反馈记录。</text>
    </view>

    <text class="feedback-form__label">问题分类</text>
    <picker
      :range="FEEDBACK_CATEGORIES"
      range-key="label"
      :value="categoryIndex"
      @change="handleCategoryChange"
    >
      <view class="feedback-form__picker">
        {{ categoryLabel || '请选择内容、发音、显示或功能问题' }}
      </view>
    </picker>

    <view class="feedback-form__label-row">
      <text class="feedback-form__label">补充说明</text>
      <text class="feedback-form__count">{{ store.draft.description.length }}/300</text>
    </view>
    <textarea
      class="feedback-form__textarea"
      maxlength="300"
      placeholder="请说明遇到的问题和出现位置"
      :value="store.draft.description"
      @input="handleDescriptionInput"
    />

    <view v-if="store.draft.screenshots[0]" class="feedback-form__screenshot">
      <image
        class="feedback-form__preview"
        mode="aspectFill"
        :src="store.draft.screenshots[0].path"
      />
      <view>
        <text class="feedback-form__screenshot-title">已附加 1 张截图</text>
        <text class="feedback-form__hint">提交时会进行内容安全检查</text>
        <button class="feedback-form__remove" @click="removeScreenshot">删除截图</button>
      </view>
    </view>
    <button v-else class="feedback-form__upload" @click="chooseScreenshot">
      ＋ 添加截图（选填，最多 1 张）
    </button>

    <text v-if="error" class="feedback-form__error" role="alert">{{ error }}</text>
    <AppButton :loading="loading" label="提交反馈" @press="submit" />
    <text class="feedback-form__privacy">问题反馈不是即时聊天，请勿填写联系方式或交易信息。</text>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.feedback-form {
  padding: 30rpx;
  border: 2rpx solid tokens.$color-border;
  border-radius: tokens.$radius-large;
  background: rgb(255 255 255 / 80%);

  &__blocked {
    margin-bottom: 28rpx;
    padding: 22rpx;
    border-radius: tokens.$radius-medium;
    background: #fbe8e5;
    color: tokens.$color-danger;
    font-size: 23rpx;
    line-height: 1.55;
  }

  &__blocked-title {
    display: block;
    margin-bottom: 6rpx;
    font-size: 27rpx;
    font-weight: 700;
  }

  &__label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 28rpx;
  }

  &__label {
    display: block;
    font-size: 25rpx;
    font-weight: 700;
  }

  &__count,
  &__hint,
  &__privacy {
    color: tokens.$color-text-muted;
    font-size: 21rpx;
  }

  &__picker,
  &__textarea,
  &__upload {
    width: 100%;
    border: 2rpx solid tokens.$color-border;
    border-radius: tokens.$radius-medium;
    background: tokens.$color-white;
    color: tokens.$color-text;
    font-size: 25rpx;
  }

  &__picker {
    min-height: 84rpx;
    margin-top: 14rpx;
    padding: 24rpx;
  }

  &__textarea {
    box-sizing: border-box;
    height: 260rpx;
    margin-top: 14rpx;
    padding: 24rpx;
    line-height: 1.6;
  }

  &__upload {
    min-height: 92rpx;
    margin: 24rpx 0;
    padding: 20rpx;
    color: tokens.$color-primary;
    text-align: center;
  }

  &__screenshot {
    display: grid;
    align-items: center;
    margin: 24rpx 0;
    padding: 18rpx;
    border-radius: tokens.$radius-medium;
    background: tokens.$color-module;
    gap: 20rpx;
    grid-template-columns: 120rpx 1fr;
  }

  &__preview {
    width: 120rpx;
    height: 120rpx;
    border-radius: tokens.$radius-small;
  }

  &__screenshot-title,
  &__hint {
    display: block;
  }

  &__screenshot-title {
    font-size: 24rpx;
    font-weight: 700;
  }

  &__hint {
    margin-top: 6rpx;
  }

  &__remove {
    display: inline-flex;
    margin: 10rpx 0 0;
    padding: 0;
    background: transparent;
    color: tokens.$color-danger;
    font-size: 22rpx;
  }

  &__error {
    display: block;
    margin: 0 0 18rpx;
    color: tokens.$color-danger;
    font-size: 23rpx;
  }

  &__privacy {
    display: block;
    margin-top: 18rpx;
    text-align: center;
  }
}
</style>
