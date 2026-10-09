<script setup lang="ts">
import AppButton from '@/components/app-button/app-button.vue'
import SourceList from '@/features/favorites/components/source-list.vue'
import { useFavoriteGroup } from '@/features/favorites/use-favorite-group'
import PersonalPage from '@/features/profile/components/personal-page.vue'
import PersonalRow from '@/features/profile/components/personal-row.vue'
import PersonalSummary from '@/features/profile/components/personal-summary.vue'
import { useAnalyticsPage } from '@/services/analytics/use-analytics-page'
import { FavoriteType } from '@/shared/enums/favorites'
import { NavigationType } from '@/shared/enums/navigation'
import { ProfileTabKey } from '@/shared/enums/profile'
import { navigate } from '@/shared/navigation/navigate'

const { item, group, error } = useFavoriteGroup('来源加载失败，请返回收藏后重试')
/** 进入原文稳定位置，url 为已校验权限的来源地址 */
const open = (url: string) => navigate({ type: NavigationType.NAVIGATE_TO, url })
/** 返回收藏银行 */
const back = () =>
  navigate({
    type: NavigationType.RE_LAUNCH,
    url:
      item.value?.entry_type === FavoriteType.PHRASE
        ? '/sub-packages/favorites/phrases'
        : '/pages/favorites/index'
  })
useAnalyticsPage('sub-packages/favorites/sources')
</script>
<template>
  <PersonalPage
    :active="ProfileTabKey.FAVORITES"
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
        :label="item?.entry_type === FavoriteType.PHRASE ? '返回语块银行' : '返回词汇银行'"
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
