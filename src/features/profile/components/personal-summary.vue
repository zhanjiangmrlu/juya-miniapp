<script setup lang="ts">
import type { PersonalSummaryProps } from '@/shared/types/profile-components'

withDefaults(defineProps<PersonalSummaryProps>(), {
  compact: false
})
</script>
<template>
  <view class="summary" :class="{ compact }"
    ><text class="summary-label">{{ label }}</text
    ><text class="summary-value">{{ value }}</text
    ><text class="summary-note">{{ note }}</text
    ><slot
  /></view>
</template>
<style scoped lang="scss">
.summary {
  position: relative;
  min-height: 118px;
  padding: 12px 16px 10px;
  border-radius: 15px;
  background: #e5efdc;

  .summary-label,
  .summary-value,
  .summary-note {
    display: block;
    overflow-wrap: anywhere;
  }

  .summary-label {
    min-height: 23px;
    color: #4e7f3b;
    font-size: 12px;
    line-height: 20px;
  }

  .summary-value {
    min-height: 45px;
    color: #254733;
    font-size: 30px;
    font-weight: 700;
    line-height: 42px;
  }

  .summary-note {
    margin-top: 2px;
    color: #657965;
    font-size: 11px;
    line-height: 20px;
  }

  &.compact .summary-value {
    font-size: 25px;
  }
}
</style>
