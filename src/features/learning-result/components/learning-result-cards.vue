<script setup lang="ts">
import type { LearningResultCard } from '@/features/learning-result/result-presenter'

defineProps<{ cards: LearningResultCard[] }>()

const emit = defineEmits<{
  select: [route: string]
}>()

/** 打开成果卡对应的明细页面。 */
function handleSelect(route: string) {
  emit('select', route)
}
</script>

<template>
  <view class="result-cards">
    <button
      v-for="card in cards"
      :key="card.label"
      class="result-cards__card"
      @click="handleSelect(card.route)"
    >
      <text class="result-cards__value">{{ card.value }}</text>
      <text class="result-cards__label">{{ card.label }}</text>
      <text class="result-cards__action">查看明细</text>
    </button>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.result-cards {
  display: grid;
  gap: 16rpx;

  &__card {
    display: grid;
    width: 100%;
    min-height: 96rpx;
    align-items: center;
    margin: 0;
    padding: 20rpx 28rpx;
    border: 2rpx solid tokens.$color-border;
    border-radius: tokens.$radius-medium;
    background: rgb(255 255 255 / 72%);
    color: tokens.$color-text;
    gap: 18rpx;
    grid-template-columns: auto 1fr auto;
    text-align: left;
  }

  &__value {
    color: tokens.$color-primary;
    font-family: Georgia, serif;
    font-size: 42rpx;
    font-weight: 700;
  }

  &__label {
    font-size: 26rpx;
    font-weight: 700;
  }

  &__action {
    color: tokens.$color-text-muted;
    font-size: 21rpx;
  }
}
</style>
