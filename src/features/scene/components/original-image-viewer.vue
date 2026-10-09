<script setup lang="ts">
import { useModalScrollLock } from '@/shared/use-page-scroll-lock'

defineProps<{ chineseTitle: string; title: string; imageUrl: string }>()
const emit = defineEmits<{ close: []; error: [] }>()

useModalScrollLock()
</script>
<template>
  <view
    class="original-viewer"
    role="dialog"
    aria-modal="true"
    aria-label="完整学习原图"
    @touchmove.stop.prevent
  >
    <button class="viewer-close" aria-label="关闭原图" @click="emit('close')">×</button>
    <view class="viewer-heading"
      ><text class="viewer-chinese">{{ chineseTitle }}</text
      ><text class="viewer-english">{{ title }}</text></view
    >
    <view class="viewer-image"
      ><image class="original-image" :src="imageUrl" mode="aspectFit" @error="emit('error')" /><text
        class="viewer-caption"
        >完整学习原图 · 仅在已获权限场景中查看</text
      ></view
    >
  </view>
</template>
<style scoped lang="scss">
.original-viewer {
  position: fixed;
  z-index: 80;
  overflow-y: auto;
  background: #1a2a21;
  color: #fff;
  inset: 0;

  .viewer-close {
    position: absolute;
    top: calc(39px + env(safe-area-inset-top));
    right: 19px;
    width: 42px;
    height: 42px;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: #fff;
    font-size: 31px;
    line-height: 42px;

    &::after {
      border: 0;
    }
  }

  .viewer-heading {
    margin: 95px 20px 0;
    font-size: 21px;
    font-weight: 700;
    line-height: 37px;

    .viewer-chinese,
    .viewer-english {
      display: block;
    }
  }

  .viewer-english {
    color: #d7e1d7;
    font-size: 13px;
    font-weight: 400;
    line-height: 27px;
  }

  .viewer-image {
    width: calc(100% - 40px);
    max-width: 700px;
    margin: 24px auto calc(30px + env(safe-area-inset-bottom));

    .viewer-caption {
      display: block;
      margin: 16px 20px 0;
      color: #d7e1d7;
      font-size: 12px;
      line-height: 24px;
      text-align: center;
    }
  }

  .original-image {
    display: block;
    width: 100%;
    height: 60vh;
    max-height: min(
      560px,
      calc(100vh - 260px - env(safe-area-inset-top) - env(safe-area-inset-bottom))
    );
    border-radius: 12px;
  }
}
</style>
