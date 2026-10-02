<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'

import AppButton from '@/components/app-button/app-button.vue'
import SourceList from '@/features/favorites/components/source-list.vue'
import { loadFavoriteGroup } from '@/features/favorites/load-favorite-group'
import PersonalPage from '@/features/profile/components/personal-page.vue'
import PersonalRow from '@/features/profile/components/personal-row.vue'
import PersonalSummary from '@/features/profile/components/personal-summary.vue'
import { getRuntimeServices } from '@/services/runtime'
import { navigate } from '@/shared/navigation/navigate'

import type { FavoriteGroup } from '@/features/favorites/favorite-presenter'
import type { FavoriteItem } from '@/shared/contracts/favorites'
const item = ref<FavoriteItem>()
const error = ref('')
const group = ref<FavoriteGroup>()
/** 加载收藏的全部来源，query 为收藏标识 */
const load = async (query?: Record<string, string>) => {
  try {
    if (query?.id) {
      const loaded = await loadFavoriteGroup(getRuntimeServices().favorites, query.id)
      item.value = loaded.item
      group.value = loaded.group
    }
  } catch {
    error.value = '来源加载失败，请返回收藏后重试'
  }
}
/** 进入原文稳定位置，url 为已校验权限的来源地址 */
const open = (url: string) => navigate({ type: 'navigateTo', url })
/** 返回收藏银行 */
const back = () =>
  navigate({
    type: 'reLaunch',
    url: item.value?.entry_type === 'PHRASE' ? '/pages/favorites/phrases' : '/pages/favorites/index'
  })
onLoad(load)
</script>
<template>
  <PersonalPage
    active="favorites"
    navigation="来源场景"
    title="选择来源场景"
    subtitle="同一收藏可以来自多个场景"
  >
    <PersonalSummary
      label="收藏词条"
      :value="item?.english || item?.normalized_key || '正在加载'"
      :note="`${item?.chinese || ''}；保留全部来源句`"
    />
    <text v-if="error" class="form-error">{{ error }}</text>
    <text class="section-title">来源列表</text
    ><SourceList :sources="group?.sources || []" @open="open" />
    <view class="source-note"
      ><PersonalRow title="来源记录" detail="权限恢复后可重新进入原文" badge="保留"
    /></view>
    <template #actions
      ><AppButton
        :label="item?.entry_type === 'PHRASE' ? '返回语块银行' : '返回词汇银行'"
        @press="back"
    /></template>
  </PersonalPage>
</template>
<style scoped lang="scss">
@use '../../features/profile/personal';

.source-note {
  margin-top: 10px;
}
</style>
