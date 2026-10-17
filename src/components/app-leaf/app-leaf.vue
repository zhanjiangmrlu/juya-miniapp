<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 48 })
</script>
<template>
  <view class="leaf-glyph" :style="{ width: `${size}rpx`, height: `${size}rpx` }" aria-hidden="true"
    ><view class="leaf-blade" /><view class="leaf-stem" /><view class="leaf-vein"
  /></view>
</template>
<style scoped lang="scss">
.leaf-glyph {
  position: relative;
  display: block;
  flex-shrink: 0;
  color: #347553;

  .leaf-blade {
    position: absolute;
    left: 16%;
    top: 10%;
    width: 68%;
    height: 76%;
    border: 2px solid currentcolor;
    border-radius: 80% 8%;
    transform: rotate(8deg);
  }

  .leaf-stem {
    position: absolute;
    width: 2px;
    height: 74%;
    left: 45%;
    top: 25%;
    background: currentcolor;
    transform: rotate(35deg);
    transform-origin: center;
  }

  .leaf-vein {
    position: absolute;
    width: 28%;
    height: 2px;
    left: 40%;
    top: 45%;
    background: currentcolor;
    transform: rotate(10deg);
  }
}
</style>
