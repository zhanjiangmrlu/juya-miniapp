<script setup lang="ts">
import { ref } from 'vue'

import AppButton from '@/components/app-button/app-button.vue'
import AppState from '@/components/app-state/app-state.vue'
import AudioButton from '@/features/audio/components/audio-button.vue'
import { useFavoriteGroup } from '@/features/favorites/use-favorite-group'
import PersonalPage from '@/features/profile/components/personal-page.vue'
import PersonalRow from '@/features/profile/components/personal-row.vue'
import PersonalSummary from '@/features/profile/components/personal-summary.vue'
import { getRuntimeServices } from '@/services/runtime'
import { navigate } from '@/shared/navigation/navigate'
import { useAudioStore } from '@/stores/audio'

import type { AudioTarget } from '@/shared/contracts/learning'
const { item, group, error } = useFavoriteGroup('收藏加载失败，请返回收藏后重试')
const removing = ref(false)
const audio = useAudioStore()
/** 多来源时进入来源选择，单来源时进入稳定原文位置 */
const returnSource = async () => {
  if (!item.value || !group.value) return
  const url =
    group.value.sources.length === 1 && group.value.sources[0]?.returnUrl
      ? group.value.sources[0].returnUrl
      : `/pages/favorites/sources?id=${encodeURIComponent(item.value.id)}`
  await navigate({ type: 'navigateTo', url })
}
/** 删除当前收藏并返回银行 */
const remove = async () => {
  if (!item.value || removing.value) return
  removing.value = true
  try {
    await Promise.all(
      (group.value?.items || [item.value]).map((favorite) =>
        getRuntimeServices().favorites.remove(favorite.id)
      )
    )
    uni.navigateBack()
  } catch {
    error.value = '取消收藏失败，请重试'
  } finally {
    removing.value = false
  }
}
/** 独立播放发音，target 为当前收藏的音频引用 */
const play = (target: AudioTarget) => audio.play(target, getRuntimeServices().scene)
</script>
<template>
  <PersonalPage
    active="favorites"
    navigation="收藏详情"
    title="收藏条目详情"
    :subtitle="`${item?.entry_type === 'PHRASE' ? '语块银行' : '词汇银行'} · 来自「${group?.sources[0]?.scene_title || '来源场景'}」`"
  >
    <template v-if="item">
      <PersonalSummary
        :label="item.english || item.normalized_key"
        :value="item.phonetic || item.english || item.normalized_key"
        :note="item.chinese || ''"
      />
      <text class="section-title">词汇与来源</text>
      <view class="row-list">
        <PersonalRow
          title="简明解释"
          :detail="item.explanation || item.chinese || '暂无解释'"
          badge="解释"
        />
        <PersonalRow
          title="来源句"
          :detail="group?.sources.map((source) => source.sentence_snapshot).join('\n') || ''"
          badge="可查看"
          actionable
          @press="returnSource"
        />
        <PersonalRow
          title="收藏状态"
          :detail="`已加入${item.entry_type === 'PHRASE' ? '语块银行' : '词汇银行'}`"
          :badge="removing ? '处理中' : '取消收藏'"
          actionable
          @press="remove"
        />
      </view>
      <text v-if="error" class="form-error">{{ error }}</text>
      <AudioButton
        v-if="item.audio"
        :target="item.audio"
        :status="audio.snapshot.status"
        :current-key="audio.currentKey"
        @play="play"
      />
    </template>
    <AppState
      v-else
      icon-label="状态"
      title="未找到收藏"
      :description="error || '请从收藏银行进入有效记录'"
    />
    <template #actions><AppButton v-if="item" label="返回原文" @press="returnSource" /></template>
  </PersonalPage>
</template>
<style scoped lang="scss">
@use '../../features/profile/personal';
</style>
