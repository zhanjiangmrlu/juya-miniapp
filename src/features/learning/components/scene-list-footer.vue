<script setup lang="ts">
import { onHide, onShow } from '@dcloudio/uni-app'
import { computed, getCurrentInstance, nextTick, onMounted, onUnmounted, watch } from 'vue'

import AppLoading from '@/components/app-loading/app-loading.vue'

import type { NativeObserverScope, SceneListFooterProps } from '@/shared/types/learning-components'
const props = defineProps<SceneListFooterProps>(),
  emit = defineEmits<{ more: []; refresh: [] }>(),
  instance = getCurrentInstance(),
  ready = computed(
    () =>
      props.hasMore &&
      !props.done &&
      !props.busy &&
      !props.refreshing &&
      !props.error &&
      !props.refreshError
  )
let observer: UniNamespace.IntersectionObserver | undefined,
  generation = 0,
  visible = true,
  alive = true
/** 释放旧位置监听，并拒绝已排队的迟到通知 */
const stop = () => {
  generation++
  observer?.disconnect()
  observer = undefined
}
/** 每页落到页面后重新测量底部，首屏不足以滚动时也能自动追加 */
const observe = async () => {
  stop()
  const run = generation
  await nextTick()
  if (
    !alive ||
    !visible ||
    !ready.value ||
    run !== generation ||
    typeof uni === 'undefined' ||
    typeof uni.createIntersectionObserver !== 'function'
  )
    return
  // 微信使用原生组件作用域，H5 沿用 Uni 的组件范围监听
  const scope = (instance?.proxy as NativeObserverScope | undefined)?.$scope
  observer = scope
    ? scope.createIntersectionObserver({ nativeMode: true })
    : uni.createIntersectionObserver(instance?.proxy)
  observer?.relativeToViewport({ bottom: 80 }).observe('.list-footer', (entry) => {
    // 一个可见周期只触发一次；下一页完成后用新位置决定是否继续
    if (run !== generation || !visible || !ready.value || entry.intersectionRatio <= 0) return
    stop()
    emit('more')
  })
}
onMounted(observe)
watch(
  () => [props.hasMore, props.done, props.busy, props.refreshing, props.error, props.refreshError],
  observe,
  { flush: 'post' }
)
onShow(() => {
  visible = true
  void observe()
})
onHide(() => {
  visible = false
  stop()
})
onUnmounted(() => {
  alive = false
  stop()
})
</script>
<template>
  <view class="list-footer" aria-live="polite"
    ><AppLoading v-if="refreshing" label="正在刷新" /><template v-else-if="refreshError"
      ><text class="list-error">列表暂未更新：{{ refreshError }}</text
      ><button class="text-button footer-retry" @click="$emit('refresh')">
        刷新失败，点击重试
      </button></template
    ><AppLoading v-else-if="busy" /><template v-else-if="error"
      ><text class="list-error">{{ error }}</text
      ><button class="text-button footer-retry" @click="$emit('more')">
        加载失败，点击重试
      </button></template
    ><text v-else-if="hasMore">继续滑动加载更多</text><text v-else-if="done">已全部加载</text></view
  >
</template>
<style scoped lang="scss">
.list-footer {
  padding: 34.615rpx 0;
  text-align: center;
  color: #586c5b;
  font-size: 23.077rpx;
  line-height: 1.8;

  .footer-retry {
    width: 100%;
  }

  .list-error {
    display: block;
    color: #ad4f32;
  }
}
</style>
