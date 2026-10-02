<script setup lang="ts">
withDefaults(
  defineProps<{ label: string; value: string; description: string; sentence?: boolean }>(),
  { sentence: false }
)
</script>
<template>
  <view class="entry-summary" :class="{ sentence }"
    ><text class="summary-label">{{ label }}</text
    ><text class="summary-value">{{ value }}</text
    ><text class="summary-copy">{{ description }}</text></view
  >
</template>
<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.entry-summary {
  min-height: 118px;
  padding: 12px 16px 10px;
  border-radius: 15px;
  background: #e5efdc;

  .summary-label,
  .summary-value,
  .summary-copy {
    display: block;
    transform: translateY(-4px);
    overflow-wrap: anywhere;
  }

  .summary-label {
    color: tokens.$color-primary;
    font-size: 12px;
    line-height: 23px;
  }

  .summary-value {
    min-height: 45px;
    margin-top: 1px;
    font-size: 30px;
    font-weight: 700;
    line-height: 45px;
  }

  .summary-copy {
    margin-top: 1px;
    color: #657965;
    font-size: 11px;
    line-height: 23px;
  }

  &.sentence {
    .summary-value {
      padding-top: 3px;
      font-size: 17px;
      line-height: 27px;
    }
  }
}
</style>
