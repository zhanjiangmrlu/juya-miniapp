<script setup lang="ts">
import { onHide, onShow, onUnload } from '@dcloudio/uni-app'
import { nextTick, ref } from 'vue'

import AppButton from '@/components/app-button/app-button.vue'
import { presentContact } from '@/features/contact-profile/contact-form'
import { shouldExposeContactPrompt } from '@/features/contact-profile/contact-prompt'
import { loadAllMessages } from '@/features/messages/load-messages'
import PersonalPage from '@/features/profile/components/personal-page.vue'
import ProfileActionList from '@/features/profile/components/profile-action-list.vue'
import ProfileIdentity from '@/features/profile/components/profile-identity.vue'
import { createRequestId } from '@/services/http/request-id'
import { getRuntimeServices } from '@/services/runtime'
import { MessageRelatedType } from '@/shared/enums/messages'
import { NavigationType } from '@/shared/enums/navigation'
import { ButtonVariant } from '@/shared/enums/ui'
import { navigate } from '@/shared/navigation/navigate'
import { useModalScrollLock } from '@/shared/use-page-scroll-lock'

import type { UserProfile } from '@/shared/contracts/profile'
import type { ContactPromptReceipt } from '@/shared/types/profile'
const profile = ref<UserProfile>()
const contact = ref(presentContact(null))
const unread = ref(0)
const feedbackUnread = ref(0)
const promptVisible = ref(false)
useModalScrollLock(promptVisible)
const error = ref('')
let visible = false
let generation = 0
/** 跳转档案服务，url 为当前用户允许访问的站内地址 */
const open = (url: string) => navigate({ type: NavigationType.NAVIGATE_TO, url })
/** 主动完善时直接进入表单，已填写则进入管理页 */
const openContact = () =>
  open(
    contact.value.wechatId
      ? '/sub-packages/profile/contact-manage'
      : '/sub-packages/profile/contact-edit'
  )
/** 关闭一次提示，实际曝光记录在显示时已经写入 */
const dismiss = () => {
  promptVisible.value = false
}
/** 从提示继续完善本人联系资料 */
const continueForm = async () => {
  dismiss()
  await openContact()
}
/** 刷新本人完整资料、红点，并在实际渲染后记录一次提示曝光 */
const load = async () => {
  const current = ++generation
  try {
    const runtime = getRuntimeServices()
    const [user, info, home, messages] = await Promise.all([
      runtime.profile.get(),
      runtime.contact.get(),
      runtime.home.getHome(),
      loadAllMessages(runtime.messages)
    ])
    if (!visible || current !== generation) return
    profile.value = user
    contact.value = presentContact(info)
    unread.value = home.unread_message_count
    feedbackUnread.value = messages.filter(
      (message) => !message.read_at && message.related_type === MessageRelatedType.FEEDBACK
    ).length
    const storageKey = `juya.contact-prompt.${user.juya_id}`
    let exposure = uni.getStorageSync(storageKey) as ContactPromptReceipt | ''
    if (
      shouldExposeContactPrompt(
        Boolean(user.contact_prompt_eligible),
        contact.value.wechatId,
        Boolean(exposure)
      )
    ) {
      promptVisible.value = true
      await nextTick()
      if (!visible || current !== generation) {
        promptVisible.value = false
        return
      }
      exposure = { key: createRequestId(), recorded: false }
      uni.setStorageSync(storageKey, exposure)
    }
    if (exposure && !exposure.recorded) {
      try {
        await runtime.contact.recordPromptExposure(exposure.key)
        uni.setStorageSync(storageKey, { ...exposure, recorded: true })
      } catch {
        /* 下次显示档案时使用同一幂等键补记曝光 */
      }
    }
    error.value = ''
  } catch {
    if (visible && current === generation) error.value = '资料加载失败，请重试'
  }
}
/** 当前页可见时刷新资料并重新判断曝光 */
const show = async () => {
  visible = true
  await load()
}
/** 隐藏或销毁档案页时使旧请求失效，未显示的提示不得记为曝光 */
const hide = () => {
  visible = false
  generation++
  promptVisible.value = false
}
onShow(show)
onHide(hide)
onUnload(hide)
</script>
<template>
  <PersonalPage title="我的学习档案" subtitle="个人学习信息仅向你本人显示">
    <ProfileIdentity
      :juya-id="profile?.juya_id || '正在加载'"
      :nickname="profile?.nickname || profile?.wechat_nickname || '学习者'"
      :avatar="profile?.avatar_url"
      :wechat-label="`微信号：${contact.wechatId || '未填写，去完善'}`"
      @contact="openContact"
    />
    <text class="section-title">我的服务</text
    ><ProfileActionList
      :unread="unread"
      :feedback-unread="feedbackUnread"
      :prompt="promptVisible"
      @contact="openContact"
      @entitlements="open('/sub-packages/entitlement/index')"
      @messages="open('/sub-packages/feedback/messages')"
      @feedback="open('/sub-packages/feedback/index')"
      @account="open('/sub-packages/account/index')"
    />
    <text v-if="error" class="form-error">{{ error }}</text
    ><AppButton v-if="error" label="重新加载" :variant="ButtonVariant.SECONDARY" @press="load" />
    <template #overlay
      ><view v-if="promptVisible" class="prompt-overlay" @touchmove.stop.prevent @wheel.stop.prevent
        ><view class="prompt-dialog" role="dialog" aria-modal="true" aria-label="完善联系资料"
          ><text class="prompt-title">完善联系资料</text
          ><text class="prompt-copy"
            >微信号用于账号服务、学习协助和重要信息通知。填写不会自动获得新的学习权限，也不影响已开放的内容。</text
          ><view class="prompt-actions"
            ><AppButton
              label="稍后再说"
              :variant="ButtonVariant.SECONDARY"
              @press="dismiss" /><AppButton
              label="前往完善"
              @press="continueForm" /></view></view></view
    ></template>
  </PersonalPage>
</template>
<style scoped lang="scss">
@use '../../profile/personal';

.prompt-overlay {
  position: fixed;
  z-index: 40;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(20 37 27 / 43%);

  .prompt-dialog {
    width: calc(100% - 60px);
    max-width: 420px;
    min-height: 263px;
    margin-top: -13px;
    padding: 23px 22px 40px;
    border-radius: 18px;
    background: #fffdf7;
  }

  .prompt-title {
    display: block;
    font-size: 19px;
    font-weight: 700;
    line-height: 31px;
  }

  .prompt-copy {
    display: block;
    min-height: 87px;
    margin-top: 13px;
    color: #617360;
    font-size: 13px;
    line-height: 17px;
  }

  .prompt-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin-top: 17px;
  }

  :deep(.app-button) {
    min-height: 47px;
    font-size: 14px;
    font-weight: 500;
  }

  :deep(.button-secondary) {
    border: 1px solid #7eaa6d;
    background: #fffdf7;
  }
}
</style>
