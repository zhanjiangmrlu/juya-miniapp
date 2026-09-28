<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'

import AppButton from '@/components/app-button/app-button.vue'
import AppPage from '@/components/app-page/app-page.vue'
import AppState from '@/components/app-state/app-state.vue'
import PageHeader from '@/components/page-header/page-header.vue'
import MessageCard from '@/features/messages/components/message-card.vue'
import { openMessage } from '@/features/messages/message-router'
import { getRuntimeServices } from '@/services/runtime'
import { navigate } from '@/shared/navigation/navigate'

import type { MessageItem } from '@/shared/contracts/messages'

const items = ref<MessageItem[]>([])

/** 读取站内消息服务端列表，已读消息仍保留。 */
async function loadMessages() {
  items.value = (await getRuntimeServices().messages.list()).items
}

/** 先标记消息已读，再打开它关联的业务页面。 */
async function handleOpen(item: MessageItem) {
  await openMessage(
    item,
    (id) => getRuntimeServices().messages.markRead(id),
    (url) => navigate({ type: 'navigateTo', url })
  )
}

/** 打开新反馈表单。 */
async function createFeedback() {
  await navigate({ type: 'navigateTo', url: '/pages/feedback/create' })
}

onShow(loadMessages)
</script>

<template>
  <AppPage>
    <PageHeader eyebrow="处理进展会保留在这里" title="站内消息" />
    <view class="message-list">
      <MessageCard v-for="item in items" :key="item.id" :item="item" @open="handleOpen" />
      <AppState
        v-if="items.length === 0"
        description="反馈回复和系统状态消息会显示在这里。"
        icon-label="消息"
        title="暂时没有消息"
      />
    </view>
    <AppButton label="提交新反馈" @press="createFeedback" />
  </AppPage>
</template>

<style scoped lang="scss">
.message-list {
  display: grid;
  margin-bottom: 24rpx;
  gap: 18rpx;
}
</style>
