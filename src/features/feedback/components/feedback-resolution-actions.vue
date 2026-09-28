<script setup lang="ts">
import { computed, ref } from 'vue'

import AppButton from '@/components/app-button/app-button.vue'
import { getResolutionActions, validateSupplement } from '@/features/feedback/feedback-form'

import type { FeedbackItem, FeedbackResolutionRequest } from '@/shared/contracts/feedback'

const props = defineProps<{ item: FeedbackItem }>()
const emit = defineEmits<{ resolve: [payload: FeedbackResolutionRequest] }>()
const reason = ref('')
const error = ref('')
const actions = computed(() => getResolutionActions(props.item))

/** 同步重开原因草稿。 */
function handleReasonInput(event: unknown) {
  reason.value = (event as { detail: { value: string } }).detail.value
}

/** 确认问题已经解决。 */
function confirmResolved() {
  emit('resolve', { action: 'RESOLVED' })
}

/** 校验重开原因并提交一次性重开动作。 */
function reopen() {
  const result = validateSupplement(reason.value)
  if (!result.valid || !result.normalized) {
    error.value = '请填写 1 至 300 字的重开原因'
    return
  }
  error.value = ''
  emit('resolve', { action: 'REOPEN', reason: result.normalized })
}
</script>

<template>
  <view v-if="actions.showResolvedAction" class="resolution-actions">
    <textarea
      v-if="actions.canReopen"
      class="resolution-actions__reason"
      maxlength="300"
      placeholder="仍有问题时，请说明原因"
      :value="reason"
      @input="handleReasonInput"
    />
    <text v-if="error" class="resolution-actions__error">{{ error }}</text>
    <view class="resolution-actions__buttons">
      <AppButton :block="false" label="已解决" @press="confirmResolved" />
      <button v-if="actions.canReopen" class="resolution-actions__reopen" @click="reopen">
        <text>{{ actions.reopenPrimaryLabel }}</text>
        <text class="resolution-actions__reopen-note">{{ actions.reopenSecondaryLabel }}</text>
      </button>
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.resolution-actions {
  margin-top: 24rpx;
  padding: 24rpx;
  border: 2rpx solid tokens.$color-border;
  border-radius: tokens.$radius-large;
  background: rgb(255 255 255 / 78%);

  &__reason {
    box-sizing: border-box;
    width: 100%;
    height: 150rpx;
    padding: 20rpx;
    border: 2rpx solid tokens.$color-border;
    border-radius: tokens.$radius-medium;
    background: tokens.$color-white;
    font-size: 24rpx;
  }

  &__error {
    display: block;
    margin-top: 12rpx;
    color: tokens.$color-danger;
    font-size: 22rpx;
  }

  &__buttons {
    display: flex;
    align-items: stretch;
    justify-content: center;
    margin-top: 18rpx;
    gap: 16rpx;
  }

  &__reopen {
    display: grid;
    min-width: 216rpx;
    min-height: 88rpx;
    place-content: center;
    margin: 0;
    padding: 12rpx 24rpx;
    border: 2rpx solid tokens.$color-border;
    border-radius: tokens.$radius-medium;
    background: tokens.$color-white;
    color: tokens.$color-primary-strong;
    font-size: 25rpx;
    font-weight: 700;
    line-height: 1.2;
  }

  &__reopen-note {
    display: block;
    margin-top: 4rpx;
    font-size: 18rpx;
    font-weight: 500;
  }
}
</style>
