<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

import AppButton from '@/components/app-button/app-button.vue'
import AppPage from '@/components/app-page/app-page.vue'
import PageHeader from '@/components/page-header/page-header.vue'
import ReviewCard from '@/features/favorites/components/review-card.vue'
import { createReviewSession } from '@/features/favorites/review-session'
import { getRuntimeServices } from '@/services/runtime'
import { navigate } from '@/shared/navigation/navigate'

const props = defineProps<{ face: 'BACK' | 'FRONT' }>()
const cardIds = ref<string[]>([])
const index = ref(0)
const currentId = computed(() => cardIds.value[index.value] ?? '收藏卡')

/** 从路由恢复翻卡队列和当前位置。 */
function handleLoad(query?: Record<string, string>) {
  cardIds.value = query?.cardIds?.split(',').filter(Boolean) ?? []
  index.value = Number(query?.index ?? 0)
}

/** 在正反面路由间切换，播放操作不会调用此函数。 */
async function flip() {
  const page = props.face === 'FRONT' ? 'review-back' : 'review-front'
  await navigate({
    type: 'redirectTo',
    url: `/pages/favorites/${page}?cardIds=${encodeURIComponent(cardIds.value.join(','))}&index=${index.value}`
  })
}

/** 播放卡片音频但保持当前卡面。 */
function playAudio() {
  createReviewSession(cardIds.value).playAudio()
  uni.showToast({ icon: 'none', title: '正在播放' })
}

/** 前往下一张；最后一张则创建并完成服务端复习会话。 */
async function next() {
  if (index.value < cardIds.value.length - 1) {
    await navigate({
      type: 'redirectTo',
      url: `/pages/favorites/review-front?cardIds=${encodeURIComponent(cardIds.value.join(','))}&index=${index.value + 1}`
    })
    return
  }

  const runtime = getRuntimeServices()
  const apiSession = await runtime.favorites.createReview(cardIds.value)
  const session = createReviewSession(cardIds.value)
  await session.complete(async (key) => runtime.favorites.completeReview(apiSession.id, key))
  await navigate({ type: 'reLaunch', url: '/pages/home/index' })
}

onLoad(handleLoad)
</script>

<template>
  <AppPage>
    <PageHeader eyebrow="翻卡复习" title="收藏复习" />
    <ReviewCard
      :face="face"
      :label="currentId"
      :position="`${Math.min(index + 1, cardIds.length)}/${cardIds.length}`"
      @flip="flip"
      @play="playAudio"
    />
    <view class="review-page__next">
      <AppButton :label="index < cardIds.length - 1 ? '下一张' : '完成复习'" @press="next" />
    </view>
  </AppPage>
</template>

<style scoped lang="scss">
.review-page {
  &__next {
    margin-top: 24rpx;
  }
}
</style>
