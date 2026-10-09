<script setup lang="ts">
import { ref } from 'vue'

import AppButton from '@/components/app-button/app-button.vue'
import {
  clearLocalLearningData,
  createUniLocalDataScope
} from '@/features/account/local-data-cleaner'
import PersonalPage from '@/features/profile/components/personal-page.vue'
import PersonalRow from '@/features/profile/components/personal-row.vue'
import PersonalSummary from '@/features/profile/components/personal-summary.vue'
import { getRuntimeServices } from '@/services/runtime'
import { NavigationType } from '@/shared/enums/navigation'
import { ButtonVariant } from '@/shared/enums/ui'
import { navigate } from '@/shared/navigation/navigate'

const loading = ref(false)
const error = ref('')

/** 取消危险操作并返回数据与账号页 */
const cancel = () => {
  uni.navigateBack()
}

/** 等待服务端确认清理成功后，再清空对应本地学习缓存 */
const confirmClear = async () => {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    await getRuntimeServices().account.clearLearningData()
    clearLocalLearningData(createUniLocalDataScope())
    uni.showToast({ icon: 'success', title: '学习数据已清空' })
    await navigate({ type: NavigationType.RE_LAUNCH, url: '/sub-packages/profile/index' })
  } catch {
    error.value = '暂时无法清空，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>
<template>
  <PersonalPage title="清空学习数据" subtitle="这项操作不可恢复"
    ><PersonalSummary
      label="将被清空"
      value="收藏、进度和打卡"
      note="账号与已有学习权益仍会保留"
      compact /><text class="section-title">请再次确认</text
    ><view class="row-list"
      ><PersonalRow
        title="收藏词汇和语块"
        detail="将从词汇银行和语块银行移除"
        badge="清除"
        danger /><PersonalRow
        title="学习进度与打卡"
        detail="连续学习记录会重新开始"
        badge="清除"
        danger /><PersonalRow
        title="账号与权益"
        detail="仍会保留，不受本操作影响"
        badge="保留" /></view
    ><text v-if="error" class="form-error">{{ error }}</text
    ><template #actions
      ><AppButton label="取消" :variant="ButtonVariant.SECONDARY" @press="cancel" /><AppButton
        label="确认清空"
        :variant="ButtonVariant.DANGER"
        :loading="loading"
        @press="confirmClear" /></template
  ></PersonalPage>
</template>
<style scoped lang="scss">
@use '../../features/profile/personal';
</style>
