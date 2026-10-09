<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'

import AppButton from '@/components/app-button/app-button.vue'
import AppState from '@/components/app-state/app-state.vue'
import MessageCard from '@/features/messages/components/message-card.vue'
import { loadAllMessages } from '@/features/messages/load-messages'
import { openMessage } from '@/features/messages/message-router'
import PersonalPage from '@/features/profile/components/personal-page.vue'
import PersonalSummary from '@/features/profile/components/personal-summary.vue'
import { useAnalyticsPage } from '@/services/analytics/use-analytics-page'
import { getRuntimeServices } from '@/services/runtime'
import { NavigationType } from '@/shared/enums/navigation'
import { ButtonVariant } from '@/shared/enums/ui'
import { navigate } from '@/shared/navigation/navigate'

import type { MessageItem } from '@/shared/contracts/messages'

const error = ref('')
const items = ref<MessageItem[]>([])

/** 读取站内消息服务端列表，已读消息仍保留 */
const loadMessages = async () => {
  try {
    items.value = await loadAllMessages(getRuntimeServices().messages)
    error.value = ''
  } catch {
    error.value = '消息加载失败，请重试'
  }
}

/** 先标记消息已读，再打开它关联的业务页面 */
const handleOpen = async (item: MessageItem) => {
  await openMessage(
    item,
    (id) => getRuntimeServices().messages.markRead(id),
    (url) => navigate({ type: NavigationType.NAVIGATE_TO, url })
  )
}

onShow(loadMessages)
useAnalyticsPage('sub-packages/feedback/messages')
</script>
<template>
  <PersonalPage title="站内消息" subtitle="反馈回复与学习状态通知">
    <PersonalSummary
      label="未读消息"
      :value="`${items.filter((item) => !item.read_at).length} 条`"
      note="打开相应结果后会清除未读状态"
    />
    <text class="section-title">最近消息</text
    ><view class="row-list"
      ><MessageCard v-for="item in items" :key="item.id" :item="item" @open="handleOpen"
    /></view>
    <AppState
      v-if="!items.length && !error"
      title="暂时没有消息"
      icon-label="消息"
      description="反馈回复和系统状态消息会显示在这里"
    />
    <text v-if="error" class="form-error">{{ error }}</text
    ><AppButton
      v-if="error"
      label="重新加载"
      :variant="ButtonVariant.SECONDARY"
      @press="loadMessages"
    />
  </PersonalPage>
</template>
<style scoped lang="scss">
@use '../../features/profile/personal';
</style>
