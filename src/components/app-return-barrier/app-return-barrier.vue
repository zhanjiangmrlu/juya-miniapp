<script setup lang="ts">
import type { ReturnBarrierEvents, ReturnBarrierProps } from '@/shared/types/profile-components'
defineProps<ReturnBarrierProps>()
defineEmits<ReturnBarrierEvents>()
</script>
<template>
  <!-- #ifdef MP-WEIXIN -->
  <page-container
    :show="show"
    :overlay="false"
    :duration="0"
    position="bottom"
    custom-style="height:0;min-height:0;padding:0;background:transparent;"
    @beforeleave="$emit('beforeleave')"
    @afterleave="$emit('afterleave')"
  />
  <!-- #endif -->
</template>
