<script setup lang="ts">
import { computed, ref } from 'vue'

import AppButton from '@/components/app-button/app-button.vue'
import { getResolutionActions, validateSupplement } from '@/features/feedback/feedback-form'

import type { FeedbackItem, FeedbackResolutionRequest } from '@/shared/contracts/feedback'
const props = withDefaults(defineProps<{ item: FeedbackItem; loading?: boolean }>(), {
  loading: false
})
const emit = defineEmits<{ resolve: [payload: FeedbackResolutionRequest] }>()
const reason = ref('')
const error = ref('')
const reopening = ref(false)
const actions = computed(() => getResolutionActions(props.item))
/** 同步重开原因，event 为用户输入事件 */
const input = (event: unknown) => {
  reason.value = (event as { detail: { value: string } }).detail.value
}
/** 确认问题已经解决 */
const resolved = () => {
  if (!props.loading) emit('resolve', { action: 'RESOLVED' })
}
/** 先收集原因，再发送七天内唯一一次重开动作 */
const reopen = () => {
  if (props.loading || !actions.value.canReopen) return
  if (!reopening.value) {
    reopening.value = true
    return
  }
  const validation = validateSupplement(reason.value)
  if (!validation.valid || !validation.normalized) {
    error.value = '请填写 1 至 300 字的重开原因'
    return
  }
  error.value = ''
  emit('resolve', { action: 'REOPEN', reason: validation.normalized })
}
</script>
<template>
  <view v-if="actions.showResolvedAction" class="resolution-actions">
    <template v-if="reopening">
      <textarea
        class="form-field"
        maxlength="300"
        placeholder="请说明仍有问题的原因"
        :value="reason"
        @input="input"
      /><text v-if="error" class="form-error">{{ error }}</text></template
    >
    <button v-if="actions.canReopen" class="reopen-button" :disabled="loading" @click="reopen">
      <text>{{ reopening ? '提交重开原因' : '仍有问题' }}</text
      ><text>（可重开一次）</text>
    </button>
    <AppButton label="已解决" :loading="loading" @press="resolved" />
  </view>
</template>
<style scoped lang="scss">
@use '../../profile/personal';

.resolution-actions {
  display: grid;
  gap: 11px;

  .form-field {
    height: 76px;
  }

  .reopen-button {
    display: flex;
    width: 100%;
    min-height: 46px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin: 0;
    padding: 3px 10px;
    border: 1px solid #7eaa6d;
    border-radius: 12px;
    background: #fffdf7;
    color: #4e7f3b;
    font-size: 14px;
    line-height: 18px;
  }
}
</style>
