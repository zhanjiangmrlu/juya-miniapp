<script setup lang="ts">
withDefaults(defineProps<{ src?: string; size?: number }>(), { src: '', size: 64 })
</script>
<template>
  <view class="avatar" :style="{ width: `${size}rpx`, height: `${size}rpx` }"
    ><image v-if="src" :src="src" mode="aspectFill" /><image
      v-else
      class="default-avatar"
      :src="size >= 160 ? '/static/design/user-large.svg' : '/static/design/user.svg'"
      mode="aspectFit"
      aria-hidden="true"
      :style="{
        width: size >= 160 ? '63.462rpx' : '38.462rpx',
        height: size >= 160 ? '63.462rpx' : '38.462rpx'
      }"
  /></view>
</template>
<style scoped lang="scss">
.avatar {
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e4f0db;
  flex-shrink: 0;
  color: #2b4438;

  image {
    width: 100%;
    height: 100%;
  }
}
</style>
