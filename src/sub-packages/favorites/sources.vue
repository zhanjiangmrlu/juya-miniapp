<script setup lang="ts">
import { onHide, onUnload } from '@dcloudio/uni-app'
import { ref, watch } from 'vue'

import AppButton from '@/components/app-button/app-button.vue'
import SourceList from '@/features/favorites/components/source-list.vue'
import { presentSourceResolution } from '@/features/favorites/source-resolution'
import { useFavoriteGroup } from '@/features/favorites/use-favorite-group'
import PersonalPage from '@/features/profile/components/personal-page.vue'
import PersonalRow from '@/features/profile/components/personal-row.vue'
import PersonalSummary from '@/features/profile/components/personal-summary.vue'
import { useAnalyticsPage } from '@/services/analytics/use-analytics-page'
import { getRuntimeServices } from '@/services/runtime'
import { FavoriteType } from '@/shared/enums/favorites'
import { NavigationType } from '@/shared/enums/navigation'
import { ProfileTabKey } from '@/shared/enums/profile'
import { navigate } from '@/shared/navigation/navigate'
import { useSessionStore } from '@/stores/session'

const { item, group, error } = useFavoriteGroup('来源加载失败，请返回收藏后重试')
const session = useSessionStore()
const resolving = ref(false)
let generation = 0
/** 离页或清理账号数据后失效旧原文权限结果 */
const invalidate = () => {
  generation++
  resolving.value = false
}
onHide(invalidate)
onUnload(invalidate)
watch(() => session.cleanupGeneration, invalidate, { flush: 'sync' })
/** 重新校验本人收藏来源，只进入当前有权版本 */
const returnSource = async () => {
  if (!item.value || resolving.value) return
  const id = item.value.id
  const request = ++generation
  resolving.value = true
  try {
    const result = presentSourceResolution(await getRuntimeServices().favorites.resolveSource(id))
    if (item.value?.id !== id || request !== generation) return
    error.value = result.message
    if (result.message) uni.showToast({ title: result.message, icon: 'none' })
    if (result.route) await open(result.route)
  } catch {
    if (item.value?.id === id && request === generation) error.value = '来源权限校验失败，请重试'
  } finally {
    if (request === generation) resolving.value = false
  }
}
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
    title="收藏来源"
    subtitle="保留收藏时资料，返回原文校验当前版本权限"
  >
    <PersonalSummary
      label="收藏词条"
      :value="item?.english || item?.normalized_key || '正在加载'"
      :note="`${item?.chinese || ''}；保留全部来源句`"
    />
    <text v-if="error" class="form-error">{{ error }}</text>
    <text class="section-title">来源列表</text><SourceList :sources="group?.sources || []" />
    <view class="source-note"
      ><PersonalRow title="来源记录" detail="权限恢复后可重新进入原文" badge="保留"
    /></view>
    <template #actions
      ><AppButton
        v-if="item"
        label="返回原文"
        :loading="resolving"
        @press="returnSource" /><AppButton
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
