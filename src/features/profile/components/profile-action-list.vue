<script setup lang="ts">
import PersonalRow from '@/features/profile/components/personal-row.vue'
withDefaults(defineProps<{ unread?: number; feedbackUnread?: number; prompt?: boolean }>(), {
  feedbackUnread: 0,
  unread: 0,
  prompt: false
})
const emit = defineEmits<{
  account: []
  entitlements: []
  feedback: []
  messages: []
  contact: []
}>()
</script>
<template>
  <view class="profile-actions">
    <PersonalRow
      title="学习权益"
      :detail="prompt ? '查看开放场景和已有权益' : '查看开放、正式和限时权益'"
      badge="›"
      :size="prompt ? 'normal' : 'short'"
      actionable
      @press="emit('entitlements')"
    />
    <view class="message-entry"
      ><PersonalRow
        title="站内消息"
        detail="反馈回复与系统消息"
        badge="›"
        :size="prompt ? 'normal' : 'short'"
        actionable
        @press="emit('messages')" /><view
        v-if="unread"
        class="unread-dot"
        :aria-label="`${unread} 条未读消息`"
    /></view>
    <PersonalRow
      v-if="prompt"
      title="联系资料"
      detail="可稍后主动完善"
      badge="›"
      actionable
      @press="emit('contact')"
    />
    <template v-else
      ><view class="message-entry"
        ><PersonalRow
          title="我的反馈"
          detail="查看记录或提交问题"
          badge="›"
          size="short"
          actionable
          @press="emit('feedback')" /><view
          v-if="feedbackUnread"
          class="unread-dot"
          :aria-label="`${feedbackUnread} 条未读反馈回复`" /></view
      ><PersonalRow
        title="数据与账号"
        detail="管理学习数据和账号"
        badge="›"
        size="short"
        actionable
        @press="emit('account')"
    /></template>
  </view>
</template>
<style scoped lang="scss">
.profile-actions {
  display: grid;
  gap: 8px;

  .message-entry {
    position: relative;
  }

  .unread-dot {
    position: absolute;
    top: 18px;
    right: 29px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #b74635;
  }
}
</style>
