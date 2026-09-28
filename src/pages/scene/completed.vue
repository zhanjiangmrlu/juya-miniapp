<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'

import AppButton from '@/components/app-button/app-button.vue'
import AppPage from '@/components/app-page/app-page.vue'
import PageHeader from '@/components/page-header/page-header.vue'
import LearningResultCards from '@/features/learning-result/components/learning-result-cards.vue'
import { presentLearningResult } from '@/features/learning-result/result-presenter'
import { getRuntimeServices } from '@/services/runtime'
import { navigate } from '@/shared/navigation/navigate'

const result = ref(presentLearningResult(null))

/** 完成页加载时读取服务端成果，失败仍保留值为 0 的明细入口。 */
async function handleLoad(query?: Record<string, string>) {
  try {
    result.value = presentLearningResult(
      await getRuntimeServices().result.get(query?.sceneId ?? 'scene-castle')
    )
  } catch {
    result.value = presentLearningResult(null)
  }
}

/** 打开成果卡对应明细。 */
async function openDetail(route: string) {
  await navigate({ type: 'navigateTo', url: route })
}

/** 返回学习列表继续选择其他场景。 */
async function continueLearning() {
  await navigate({ type: 'reLaunch', url: '/pages/learning/index' })
}

onLoad(handleLoad)
</script>

<template>
  <AppPage>
    <PageHeader eyebrow="Castle Exhibit" title="学习完成" />
    <view class="completed-page__summary">
      <text class="completed-page__eyebrow">本次学习记录</text>
      <text class="completed-page__streak">连续学习 {{ result.streakDays }} 天</text>
      <text class="completed-page__copy">对话阅读和逐句跟读已完成。</text>
      <view class="completed-page__line" />
    </view>
    <view class="completed-page__heading">
      <text>本次成果</text>
      <text>点击查看明细</text>
    </view>
    <LearningResultCards :cards="result.cards" @select="openDetail" />
    <view class="completed-page__actions">
      <AppButton label="继续学习其他场景" variant="secondary" @press="continueLearning" />
    </view>
  </AppPage>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.completed-page {
  &__summary {
    padding: 40rpx;
    border: 2rpx solid tokens.$color-border;
    border-radius: tokens.$radius-large;
    background: tokens.$color-module;
    text-align: center;
  }

  &__eyebrow,
  &__streak,
  &__copy {
    display: block;
  }

  &__eyebrow {
    color: tokens.$color-primary;
    font-size: 22rpx;
    font-weight: 700;
  }

  &__streak {
    margin-top: 18rpx;
    font-family: Georgia, serif;
    font-size: 42rpx;
    font-weight: 700;
  }

  &__copy {
    margin-top: 10rpx;
    color: tokens.$color-text-muted;
    font-size: 24rpx;
  }

  &__line {
    height: 8rpx;
    margin-top: 32rpx;
    border-radius: tokens.$radius-pill;
    background: tokens.$color-primary;
  }

  &__heading {
    display: flex;
    justify-content: space-between;
    margin: 34rpx 4rpx 18rpx;
    font-size: 23rpx;

    text:first-child {
      font-size: 32rpx;
      font-weight: 700;
    }
  }

  &__actions {
    margin-top: 24rpx;
  }
}
</style>
