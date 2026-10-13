<script setup lang="ts">
import { onHide, onUnload } from '@dcloudio/uni-app'
import { ref, watch } from 'vue'

import AppButton from '@/components/app-button/app-button.vue'
import AppState from '@/components/app-state/app-state.vue'
import PronunciationButton from '@/features/audio/components/pronunciation-button.vue'
import { usePageAudioOwner } from '@/features/audio/use-page-audio-owner'
import { getFavoriteMissingMessage } from '@/features/favorites/favorite-missing-message'
import { getFavoritePronunciation } from '@/features/favorites/favorite-pronunciation'
import { presentSourceResolution } from '@/features/favorites/source-resolution'
import { useFavoriteGroup } from '@/features/favorites/use-favorite-group'
import PersonalPage from '@/features/profile/components/personal-page.vue'
import PersonalRow from '@/features/profile/components/personal-row.vue'
import { useAnalyticsPage } from '@/services/analytics/use-analytics-page'
import { getRuntimeServices } from '@/services/runtime'
import { FavoriteType } from '@/shared/enums/favorites'
import { NavigationType } from '@/shared/enums/navigation'
import { ProfileTabKey } from '@/shared/enums/profile'
import { navigate } from '@/shared/navigation/navigate'
import { useFavoriteStore } from '@/stores/favorites'
import { useSessionStore } from '@/stores/session'

const { item, group, error } = useFavoriteGroup('收藏加载失败，请返回收藏后重试')
const removing = ref(false)
const resolving = ref(false)
const favorites = useFavoriteStore()
const session = useSessionStore()
const { cancelAudio } = usePageAudioOwner()
let sourceGeneration = 0
/** 页面离开后忽略旧原文鉴权响应 */
const leave = () => {
  cancelAudio()
  sourceGeneration++
  resolving.value = false
  removing.value = false
}
onHide(leave)
onUnload(leave)
watch(() => session.cleanupGeneration, leave, { flush: 'sync' })
/** 重新鉴权后只进入当前原文，来源更新时保留快照并提示 */
const returnSource = async () => {
  if (!item.value || resolving.value) return
  const id = item.value.id
  const request = ++sourceGeneration
  resolving.value = true
  try {
    const resolution = await getRuntimeServices().favorites.resolveSource(id)
    if (item.value?.id !== id || request !== sourceGeneration) return
    const result = presentSourceResolution(resolution)
    error.value = result.message
    if (result.message) uni.showToast({ title: result.message, icon: 'none' })
    if (result.route) await navigate({ type: NavigationType.NAVIGATE_TO, url: result.route })
  } catch {
    if (item.value?.id === id && request === sourceGeneration)
      error.value = '来源权限校验失败，请重试'
  } finally {
    if (request === sourceGeneration) resolving.value = false
  }
}
/** 删除当前收藏并返回银行 */
const remove = async () => {
  if (!item.value || removing.value) return
  const id = item.value.id
  const request = ++sourceGeneration
  removing.value = true
  resolving.value = false
  try {
    await favorites.remove(id, getRuntimeServices().favorites)
    if (request !== sourceGeneration || item.value?.id !== id) return
    uni.navigateBack()
  } catch {
    if (request === sourceGeneration && item.value?.id === id) error.value = '取消收藏失败，请重试'
  } finally {
    if (request === sourceGeneration) removing.value = false
  }
}
useAnalyticsPage('sub-packages/favorites/detail')
</script>
<template>
  <PersonalPage
    :active="ProfileTabKey.FAVORITES"
    navigation="收藏详情"
    :title="item?.entry_type === FavoriteType.PHRASE ? '收藏语块详情' : '收藏条目详情'"
    :subtitle="`${item?.entry_type === FavoriteType.PHRASE ? '语块银行' : '词汇银行'} · 来自「${group?.sources[0]?.scene_title || '来源场景'}」`"
  >
    <template v-if="item">
      <view class="favorite-summary" :class="{ phrase: item.entry_type === FavoriteType.PHRASE }">
        <view class="summary-heading"
          ><text class="summary-word">{{
            item.english || item.normalized_key || '英文待补齐'
          }}</text
          ><text v-if="item.phonetic" class="summary-phonetic">{{ item.phonetic }}</text></view
        >
        <text class="summary-meaning">{{ item.chinese || '' }}</text>
        <text v-if="getFavoriteMissingMessage(item)" class="summary-missing">{{
          getFavoriteMissingMessage(item)
        }}</text>
      </view>
      <text class="section-title"
        >{{ item.entry_type === FavoriteType.PHRASE ? '语块' : '词汇' }}与来源</text
      >
      <view class="row-list">
        <PersonalRow title="简明解释" :detail="item.explanation || '暂无解释'" badge="解释" />
        <PersonalRow
          title="来源句"
          :detail="
            group?.sources.map((source) => source.sentence_snapshot).join('\n') ||
            (item.legacy_incomplete ? '来源句待补齐' : '暂无来源句')
          "
          :badge="item.missing_fields?.includes('source_sentence') ? '待补齐' : '可查看'"
          actionable
          @press="returnSource"
        />
        <PersonalRow
          title="收藏状态"
          :detail="`已加入${item.entry_type === FavoriteType.PHRASE ? '语块银行' : '词汇银行'}`"
          badge="已收藏"
          actionable
          @press="remove"
        />
      </view>
      <text v-if="error" class="form-error">{{ error }}</text>
      <PronunciationButton
        v-if="getFavoritePronunciation(item)"
        :target="getFavoritePronunciation(item)"
        :context="{ favorite_id: item.id }"
      />
    </template>
    <AppState
      v-else
      icon-label="状态"
      title="未找到收藏"
      :description="error || '请从收藏银行进入有效记录'"
    />
    <template #actions
      ><AppButton v-if="item" label="返回原文" :loading="resolving" @press="returnSource"
    /></template>
  </PersonalPage>
</template>
<style scoped lang="scss">
@use '../../features/profile/personal';

.favorite-summary {
  display: flex;
  min-height: 120px;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
  padding: 12px;
  border: 1px solid #e0e3d5;
  border-radius: 15px;
  background: #fffdf7;
  box-sizing: border-box;

  .summary-heading {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }

  .summary-word {
    color: #254733;
    font-family: Inter, sans-serif;
    font-size: 26px;
    font-weight: 600;
    line-height: 36px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .summary-phonetic {
    color: #687561;
    font-family: Inter, sans-serif;
    font-size: 13px;
    line-height: 20px;
    overflow-wrap: anywhere;
  }

  .summary-meaning {
    color: #96523a;
    font-size: 14px;
    font-weight: 500;
    line-height: 22px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .summary-missing {
    color: #80664c;
    font-size: 12px;
    line-height: 22px;
    overflow-wrap: anywhere;
  }

  &.phrase .summary-word {
    width: 100%;
    font-size: 17px;
    line-height: 25px;
  }
}

.row-list {
  :deep(.personal-row) {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 10px 89px 10px 14px;

    .row-badge {
      position: absolute;
      top: 50%;
      right: 14px;
      width: 75px;
      text-align: right;
      transform: translateY(-50%);
    }
  }
}
</style>
