<script setup lang="ts">
import { onHide, onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { onScopeDispose, ref, watch } from 'vue'

import streakFlame from '@/features/learning-result/assets/streak-flame@3x.png'
import LearningResultCards from '@/features/learning-result/components/learning-result-cards.vue'
import { presentLearningResult } from '@/features/learning-result/result-presenter'
import { getResultReviewRoute } from '@/features/learning-result/result-review'
import ScenePageLayout from '@/features/scene/components/scene-page-layout.vue'
import { useScenePage } from '@/features/scene/use-scene-page'
import { useAnalyticsPage } from '@/services/analytics/use-analytics-page'
import { getRuntimeServices } from '@/services/runtime'
import { SCENE_COMPLETION_DETAILS as details } from '@/shared/constants/scene'
import { LearningResultStatus } from '@/shared/enums/learning-result'
import { NavigationType } from '@/shared/enums/navigation'
import { navigate } from '@/shared/navigation/navigate'
import { useSessionStore } from '@/stores/session'

import type { LearningResultViewModel } from '@/shared/types/learning-result'

const result = ref<LearningResultViewModel>()
const status = ref<LearningResultStatus>(LearningResultStatus.LOADING)
const reviewing = ref(false)
const { disposeAudio, fullModel, initialize, sceneId } = useScenePage()
let generation = 0
let suspended = false

/** 读取当前场景权威成果，失败保留同位重试，不制造零值成果 */
const loadResult = async () => {
  if (suspended || !sceneId.value) return
  const request = ++generation
  status.value = LearningResultStatus.LOADING
  result.value = undefined
  try {
    const response = await getRuntimeServices().result.get(sceneId.value)
    if (suspended || request !== generation) return
    if (!response) throw new Error('成果数据暂不可用')
    result.value = presentLearningResult(response)
    status.value = LearningResultStatus.SUCCESS
  } catch {
    if (!suspended && request === generation) status.value = LearningResultStatus.ERROR
  }
}

/** 完成页读取权威成果，query 为已完成场景路由参数 */
const handleLoad = async (query?: Record<string, string>) => {
  suspended = false
  const request = ++generation
  await initialize(query?.sceneId)
  if (suspended || request !== generation) return
  await loadResult()
}
/** 打开明细，route 为成果卡定义的真实入口 */
const openDetail = async (route: string) => {
  await navigate({ type: NavigationType.NAVIGATE_TO, url: route })
}
/** 返回首页继续学习 */
const home = async () => {
  await navigate({ type: NavigationType.RE_LAUNCH, url: '/pages/home/index' })
}
/** 读取完整有效词汇和语块队列并打开既有翻卡入口 */
const review = async () => {
  if (reviewing.value || suspended) return
  const request = generation
  reviewing.value = true
  try {
    const url = await getResultReviewRoute(getRuntimeServices().favorites)
    if (suspended || request !== generation) return
    await navigate({
      type: NavigationType.NAVIGATE_TO,
      url
    })
  } catch {
    if (!suspended && request === generation)
      uni.showToast({ icon: 'none', title: '复习入口加载失败，请重试' })
  } finally {
    if (request === generation) reviewing.value = false
  }
}
/** 离页或账号清理后失效成果和复习读取 */
const leave = () => {
  suspended = true
  generation++
  result.value = undefined
  reviewing.value = false
  status.value = LearningResultStatus.LOADING
  disposeAudio()
}
onLoad(handleLoad)
onHide(leave)
onUnload(leave)
onScopeDispose(leave)
watch(() => useSessionStore().cleanupGeneration, leave, { flush: 'sync' })
onShow(() => {
  if (suspended) {
    suspended = false
    void loadResult()
  }
})
useAnalyticsPage('sub-packages/scene/completed')
</script>
<template>
  <ScenePageLayout title="学习完成">
    <text class="scene-title">学习完成</text
    ><text class="scene-subtitle">你已完成「{{ fullModel?.chineseTitle ?? '本场景' }}」的学习</text>
    <template v-if="status === LearningResultStatus.SUCCESS && result">
      <view class="scene-highlight"
        ><text class="highlight-label">本次学习已记录</text
        ><view class="streak-value"
          ><text class="highlight-value"
            >{{ result.streakDays }} <text class="streak-unit">天</text></text
          ><image :src="streakFlame" mode="aspectFit" /></view
        ><text class="highlight-hint">连续学习，保持热爱</text></view
      >
      <LearningResultCards :cards="result.cards" @select="openDetail" />
      <view class="scene-section">查看本次成果</view>
      <view class="result-details"
        ><button
          v-for="(detail, index) in details"
          :key="detail.title"
          @click="openDetail(result.cards[index].route)"
        >
          <view
            ><text>{{ detail.title }}</text
            ><text class="result-detail-hint">{{ detail.hint }}</text></view
          ><text class="result-chevron">›</text>
        </button></view
      >
    </template>
    <view v-else class="result-state">
      <text>{{
        status === LearningResultStatus.LOADING ? '成果加载中…' : '成果加载失败，请重试'
      }}</text>
      <button
        v-if="status === LearningResultStatus.ERROR"
        class="scene-action secondary"
        @click="loadResult"
      >
        重试加载成果
      </button>
    </view>
    <view class="scene-actions"
      ><button class="scene-action secondary" @click="home">返回首页</button
      ><button
        class="scene-action"
        :class="{ 'is-disabled': reviewing }"
        :disabled="reviewing"
        @click="review"
      >
        开始翻卡复习
      </button></view
    >
  </ScenePageLayout>
</template>
<style scoped lang="scss">
@use '@/features/scene/scene-page.scss' as scene;
@include scene.page;

.scene-subtitle {
  min-height: 43px;
}

.scene-section {
  margin: 22px 0 5px;
}

.streak-value {
  display: flex;
  align-items: center;
  gap: 12px;

  image {
    width: 38px;
    height: 44px;
  }

  .highlight-value {
    font-size: 42px;
    line-height: 55px;
  }

  .streak-unit {
    font-size: 14px;
  }
}

.result-details {
  display: grid;
  gap: 7px;

  button {
    display: flex;
    width: 100%;
    min-height: 62px;
    align-items: flex-start;
    justify-content: space-between;
    margin: 0;
    padding: 8px 13px;
    border: 1px solid #d6dfc9;
    border-radius: 12px;
    background: #fffdf7;
    color: #254733;
    font-size: 14px;
    font-weight: 700;
    line-height: 24px;
    text-align: left;

    text {
      display: block;
    }
  }

  .result-detail-hint {
    margin-top: 1px;
    color: #6b7d6a;
    font-size: 11px;
    font-weight: 400;
    line-height: 19px;
  }

  .result-chevron {
    color: #4e7f3b;
    font-size: 10px;
    font-weight: 500;
    line-height: 23px;
  }
}

.scene-actions {
  padding-top: 15px;
}

@media (height <= 820px) and (width < 700px) {
  .result-details button {
    min-height: 58px;
    padding-top: 6px;
    padding-bottom: 6px;
  }
}
</style>
