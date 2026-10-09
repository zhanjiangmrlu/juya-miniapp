<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'

import AppButton from '@/components/app-button/app-button.vue'
import { shouldGateStartupForDeletion } from '@/features/account/deletion-presenter'
import PersonalPage from '@/features/profile/components/personal-page.vue'
import PersonalRow from '@/features/profile/components/personal-row.vue'
import { getRuntimeServices } from '@/services/runtime'
import { navigate } from '@/shared/navigation/navigate'

const loading = ref(true)
const error = ref('')

/** 读取本人注销状态；处于冷静期时优先进入撤回页面 */
const loadAccountState = async () => {
  loading.value = true
  try {
    const profile = await getRuntimeServices().profile.get()
    if (shouldGateStartupForDeletion(profile.deletion))
      await navigate({ type: 'redirectTo', url: '/sub-packages/account/deletion-pending' })
    error.value = ''
  } catch {
    error.value = '账号状态读取失败，请重试'
  } finally {
    loading.value = false
  }
}

/** 打开清空学习数据影响确认页 */
const openClearData = async () => {
  await navigate({ type: 'navigateTo', url: '/sub-packages/account/clear-confirm' })
}

/** 打开注销挽留与二次确认页 */
const openDeletion = async () => {
  await navigate({ type: 'navigateTo', url: '/sub-packages/account/delete-confirm' })
}

onShow(loadAccountState)
</script>
<template>
  <PersonalPage title="数据与账号" subtitle="分开管理学习数据与账号"
    ><text v-if="error" class="form-error">{{ error }}</text
    ><AppButton v-if="error" label="重新加载" variant="secondary" @press="loadAccountState" /><view
      v-if="!loading && !error"
      class="account-content"
      ><text class="section-title">学习数据</text
      ><view class="row-list"
        ><PersonalRow
          title="清空学习数据"
          detail="清除收藏、进度和打卡；保留账号与权益"
          badge="需确认"
          size="tall"
          actionable
          @press="openClearData" /><PersonalRow
          title="数据影响"
          detail="清空后不可恢复"
          badge="了解"
          size="tall"
          actionable
          @press="openClearData" /><PersonalRow
          title="注销账号"
          detail="进入 7 天注销期，期间可撤回"
          badge="谨慎操作"
          size="tall"
          actionable
          danger
          @press="openDeletion" /></view></view
  ></PersonalPage>
</template>
<style scoped lang="scss">
@use '../../features/profile/personal';

.account-content {
  padding-top: 13px;
}
</style>
