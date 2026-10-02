<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'

import AppButton from '@/components/app-button/app-button.vue'
import AppState from '@/components/app-state/app-state.vue'
import {
  type HistoryItem,
  type HistoryRow,
  presentHistory
} from '@/features/favorites/history-presenter'
import PersonalPage from '@/features/profile/components/personal-page.vue'
import PersonalRow from '@/features/profile/components/personal-row.vue'
import PersonalSummary from '@/features/profile/components/personal-summary.vue'
import { getRuntimeServices } from '@/services/runtime'
import { navigate } from '@/shared/navigation/navigate'
const rows = ref<HistoryRow[]>([])
const error = ref('')
/** 读取完整历史和当前目录，授权未确认时仅保留摘要 */
const load = async () => {
  try {
    const runtime = getRuntimeServices()
    const [history, catalog] = await Promise.all([
      runtime.client.get<{ items: HistoryItem[] }>('/api/v1/history/scenes'),
      runtime.catalog.getCatalog()
    ])
    rows.value = presentHistory(history.items, catalog.authorization_pending ? [] : catalog.items)
    error.value = ''
  } catch {
    error.value = '学习记录加载失败，请重试'
  }
}
/** 打开历史场景，route 为权限校验后的正文地址 */
const open = (route: string | null) => {
  if (route) void navigate({ type: 'navigateTo', url: route })
}
/** 返回收藏银行 */
const back = () => navigate({ type: 'reLaunch', url: '/pages/favorites/index' })
onShow(load)
</script>
<template>
  <PersonalPage
    active="favorites"
    navigation="学习记录"
    title="学习过的场景"
    subtitle="历史记录和收藏会持续保留"
    ><PersonalSummary
      label="学习记录"
      :value="`${rows.length} 个场景`"
      note="可查看当前有权限的场景正文" /><text class="section-title">最近学习</text
    ><view class="row-list"
      ><PersonalRow
        v-for="(row, index) in rows"
        :key="index"
        v-bind="row"
        :actionable="Boolean(row.route)"
        @press="open(row.route)" /></view
    ><AppState
      v-if="!rows.length && !error"
      icon-label="状态"
      title="还没有学习记录"
      description="开始或完成场景后，会在这里保留历史记录" /><text
      v-if="error"
      class="form-error"
      >{{ error }}</text
    ><AppButton v-if="error" label="重新加载" variant="secondary" @press="load" /><template #actions
      ><AppButton label="返回收藏" @press="back" /></template
  ></PersonalPage>
</template>
<style scoped lang="scss">
@use '../../features/profile/personal';
</style>
