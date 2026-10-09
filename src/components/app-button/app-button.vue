<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    block?: boolean
    disabled?: boolean
    label: string
    loading?: boolean
    variant?: 'primary' | 'secondary' | 'quiet' | 'danger'
  }>(),
  {
    block: true,
    disabled: false,
    loading: false,
    variant: 'primary'
  }
)

const emit = defineEmits<{
  press: []
}>()

/** 在禁用或处理中阻止重复操作，其余点击统一转换为 press 事件 */
const handlePress = () => {
  if (props.disabled || props.loading) {
    return
  }

  emit('press')
}
</script>

<template>
  <button
    class="app-button"
    :class="[
      `app-button--${variant}`,
      `button-${variant}`,
      { 'app-button--block': block, 'is-disabled': disabled || loading }
    ]"
    :aria-disabled="disabled || loading"
    :disabled="disabled || loading"
    :loading="loading"
    @click="handlePress"
  >
    <text class="app-button__label">{{ loading ? '处理中…' : label }}</text>
  </button>
</template>

<style scoped lang="scss">
@use '@/styles/mixins.scss' as mixins;
@use '@/styles/tokens.scss' as tokens;

.app-button {
  display: inline-flex;
  min-height: 46px;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 10px 16px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.2;

  &--block {
    width: 100%;
  }

  &--primary {
    background: tokens.$color-primary;
    color: tokens.$color-white;
  }

  &--secondary {
    border: 2rpx solid tokens.$color-border;
    background: tokens.$color-white;
    color: tokens.$color-primary-strong;
  }

  &--quiet {
    background: transparent;
    color: tokens.$color-primary-strong;
  }

  &--danger {
    background: tokens.$color-danger;
    color: tokens.$color-white;
  }

  &:focus-visible {
    @include mixins.focus-ring;
  }

  &.is-disabled {
    opacity: 0.48;
  }

  &__label {
    @include mixins.text-wrap;
  }
}
</style>
