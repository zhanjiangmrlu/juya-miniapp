<template>
  <view class="bottom-action-bar bottom-action-bar--safe">
    <view class="bottom-action-bar__content">
      <slot />
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/mixins' as mixins;
@use '@/styles/tokens' as tokens;

.bottom-action-bar {
  position: sticky;
  z-index: 20;
  bottom: 0;
  padding: tokens.$space-3 tokens.$space-4;
  border-top: 2rpx solid rgb(201 222 209 / 72%);
  background: rgb(248 241 226 / 96%);

  &--safe {
    @include mixins.safe-bottom(tokens.$space-3);
  }

  &__content {
    display: flex;
    max-width: 960rpx;
    flex-direction: column;
    gap: tokens.$space-2;
    margin: 0 auto;
  }
}
</style>
