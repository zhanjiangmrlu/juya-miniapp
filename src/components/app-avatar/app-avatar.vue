<script setup lang="ts">
import AppLeaf from '@/components/app-leaf/app-leaf.vue'
withDefaults(defineProps<{ src?: string; size?: number }>(), { src: '', size: 64 })
</script>
<template>
  <view class="avatar" :style="{ width: `${size}rpx`, height: `${size}rpx` }"
    ><image v-if="src" :src="src" mode="aspectFill" /><AppLeaf
      v-else
      :size="Math.round(size * 0.52)"
  /></view>
</template>
<style scoped lang="scss">
.avatar {
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eef3e9;
  flex-shrink: 0;
  color: #347553;

  image {
    width: 100%;
    height: 100%;
  }

  text {
    font-size: 48rpx;
    line-height: 1;
  }
}
</style>
