<script setup lang="ts">
import type { LearningResultCard } from '@/features/learning-result/result-presenter'
defineProps<{ cards: LearningResultCard[] }>()
const emit = defineEmits<{ select: [route: string] }>()
</script>
<template>
  <view class="result-cards"
    ><button
      v-for="card in cards"
      :key="card.label"
      class="result-card"
      @click="emit('select', card.route)"
    >
      <text class="result-value">{{ card.value }}</text
      ><text class="result-label">{{ card.label }}</text>
    </button></view
  >
</template>
<style scoped lang="scss">
.result-cards {
  display: grid;
  margin-top: 10px;
  gap: 8px;
  grid-template-columns: repeat(3, minmax(0, 1fr));

  .result-card {
    min-height: 84px;
    margin: 0;
    padding: 6px;
    border: 1px solid #d6dfc9;
    border-radius: 12px;
    background: #fffdf7;
    color: #254733;
    text-align: center;
  }

  .result-value,
  .result-label {
    display: block;
  }

  .result-value {
    color: #4e7f3b;
    font-size: 27px;
    font-weight: 700;
    line-height: 40px;
  }

  .result-label {
    color: #657965;
    font-size: 11px;
    line-height: 22px;
  }
}
</style>
