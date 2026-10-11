<script setup lang="ts">
import { onHide, onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { ref, watch } from 'vue'

import AppButton from '@/components/app-button/app-button.vue'
import AppState from '@/components/app-state/app-state.vue'
import { presentHistory } from '@/features/favorites/history-presenter'
import { loadSceneHistory } from '@/features/favorites/load-scene-history'
import PersonalPage from '@/features/profile/components/personal-page.vue'
import PersonalRow from '@/features/profile/components/personal-row.vue'
import PersonalSummary from '@/features/profile/components/personal-summary.vue'
import { useAnalyticsPage } from '@/services/analytics/use-analytics-page'
import { getRuntimeServices } from '@/services/runtime'
import { NavigationType } from '@/shared/enums/navigation'
import { ProfileTabKey } from '@/shared/enums/profile'
import { ButtonVariant } from '@/shared/enums/ui'
import { navigate } from '@/shared/navigation/navigate'
import { useSessionStore } from '@/stores/session'

import type { HistoryRow } from '@/shared/types/favorites'
const rows = ref<HistoryRow[]>([])
const error = ref('')
const openOnly = ref(false)
const loading = ref(false)
const session = useSessionStore()
let generation = 0
let visible = false
/** 失效旧请求并立即移除历史摘要及正文入口 */
const invalidate = () => {
  generation++
  rows.value = []
  error.value = ''
  loading.value = false
}
watch(
  () => [session.cleanupGeneration, session.isAuthenticated, session.profile?.juya_id],
  (current, previous) => {
    invalidate()
    if (!visible || !session.isAuthenticated || !session.profile?.juya_id) return
    if (current[1] !== previous[1] || current[2] !== previous[2]) void load()
    else error.value = '学习记录已更新，请重新加载'
  },
  { flush: 'sync' }
)
/** 读取完整历史和当前目录，授权未确认时仅保留摘要 */
const load = async () => {
  invalidate()
  const request = generation
  const account = session.cleanupGeneration
  loading.value = true
  const isCurrent = () => visible && request === generation && account === session.cleanupGeneration
  try {
    const runtime = getRuntimeServices()
    const [history, catalog] = await Promise.all([
      loadSceneHistory(runtime.client, isCurrent),
      runtime.catalog.getCatalog()
    ])
    if (!isCurrent() || !history) return
    rows.value = presentHistory(history, catalog.items, {
      openOnly: openOnly.value,
      authorizationPending: catalog.authorization_pending
    })
    error.value = ''
  } catch (failure) {
    if (isCurrent())
      error.value =
        (failure as { code?: string; status?: number }).code === 'CURSOR_INVALID' ||
        (failure as { status?: number }).status === 422
          ? '历史分页位置已失效，请重新加载'
          : '学习记录加载失败，请重试'
  } finally {
    if (isCurrent()) loading.value = false
  }
}
/** 打开历史场景，route 为权限校验后的正文地址 */
const open = (route: string | null) => {
  if (visible && route && rows.value.some((row) => row.route === route))
    void navigate({ type: NavigationType.NAVIGATE_TO, url: route })
}
/** 返回收藏银行 */
const back = () => navigate({ type: NavigationType.RE_LAUNCH, url: '/pages/favorites/index' })
/** 读取学习分区筛选参数，query 为历史入口路由 */
onLoad((query) => {
  openOnly.value = query?.filter === 'open'
})
onShow(() => {
  visible = true
  return load()
})
/** 离页后历史响应不得恢复页面状态 */
const leave = () => {
  visible = false
  invalidate()
}
onHide(leave)
onUnload(leave)
useAnalyticsPage('sub-packages/favorites/history')
</script>
<template>
  <PersonalPage
    :active="ProfileTabKey.FAVORITES"
    navigation="学习记录"
    :title="openOnly ? '开放复习历史' : '学习过的场景'"
    subtitle="历史记录和收藏会持续保留"
    ><PersonalSummary
      label="学习记录"
      :value="loading ? '正在加载…' : error ? '待重新加载' : `${rows.length} 个场景`"
      note="可查看当前有权限的场景正文" /><text class="section-title">最近学习</text
    ><view class="row-list"
      ><PersonalRow
        v-for="(row, index) in rows"
        :key="index"
        v-bind="row"
        :actionable="Boolean(row.route)"
        @press="open(row.route)" /></view
    ><AppState
      v-if="!rows.length && !error && !loading"
      icon-label="状态"
      title="还没有学习记录"
      description="开始或完成场景后，会在这里保留历史记录" /><text
      v-if="error"
      class="form-error"
      >{{ error }}</text
    ><AppButton
      v-if="error"
      label="重新加载"
      :variant="ButtonVariant.SECONDARY"
      :loading="loading"
      @press="load" /><template #actions><AppButton label="返回收藏" @press="back" /></template
  ></PersonalPage>
</template>
<style scoped lang="scss">
@use '../../features/profile/personal';
</style>
