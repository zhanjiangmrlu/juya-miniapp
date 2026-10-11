<script setup lang="ts">
import { onHide, onShow, onUnload } from '@dcloudio/uni-app'
import { ref, watch } from 'vue'

import AppButton from '@/components/app-button/app-button.vue'
import { chooseFeedbackScreenshot } from '@/features/feedback/screenshot-picker'
import { uploadWithUni } from '@/features/feedback/upload-service'
import PersonalPage from '@/features/profile/components/personal-page.vue'
import { getRuntimeServices } from '@/services/runtime'
import { useSessionStore } from '@/stores/session'

import type { FeedbackScreenshotDraft } from '@/shared/types/feedback'

const nickname = ref('')
const avatarKey = ref<string | null>(null)
const preview = ref('')
const loading = ref(false)
const ready = ref(false)
const error = ref('')
let generation = 0
/** 载入本人资料并保留原头像键，防止改昵称清掉头像 */
const load = async () => {
  const request = ++generation
  ready.value = false
  try {
    const profile = await getRuntimeServices().profile.get()
    if (request !== generation) return
    nickname.value = profile.nickname ?? ''
    avatarKey.value = profile.avatar_object_key ?? null
    preview.value = profile.avatar_url ?? ''
    ready.value = true
    error.value = ''
  } catch {
    if (request === generation) error.value = '资料加载失败，请重试'
  }
}
/** 更新主动输入昵称，event为本人输入内容 */
const inputNickname = (event: unknown) => {
  nickname.value = (event as { detail: { value: string } }).detail.value
}
/** 上传主动选择头像，file为本地临时图片，不持久保存临时路径 */
const uploadAvatar = async (file: FeedbackScreenshotDraft) => {
  if (loading.value || !ready.value) return
  const request = generation
  loading.value = true
  try {
    const credential = await getRuntimeServices().profile.getAvatarCredential(file.mimeType)
    if (file.size > credential.max_bytes) throw new Error('头像图片过大')
    await uploadWithUni(file, credential)
    if (request !== generation) return
    avatarKey.value = credential.key
    preview.value = file.path
    error.value = ''
  } catch {
    if (request === generation) error.value = '头像上传失败，请重新选择'
  } finally {
    if (request === generation) loading.value = false
  }
}
/** 选择自定义头像，复用已验证的图片大小和类型校验 */
const chooseAvatar = () => {
  const request = generation
  chooseFeedbackScreenshot(
    (file) => {
      if (request === generation) void uploadAvatar(file)
    },
    (message) => {
      if (request === generation) error.value = message
    }
  )
}
/** 主动使用微信头像，event为chooseAvatar生成的本地临时文件 */
const wechatAvatar = (event: unknown) => {
  const request = generation
  const path = (event as { detail: { avatarUrl: string } }).detail.avatarUrl
  uni.getFileInfo({
    filePath: path,
    success: (info) => {
      if (request === generation)
        void uploadAvatar({ path, size: info.size, mimeType: 'image/jpeg' })
    },
    fail: () => {
      error.value = '无法读取头像，请重新选择'
    }
  })
}
/** 保存本人昵称头像，失败保留输入，成功使用真实响应 */
const save = async () => {
  if (loading.value || !ready.value) return
  const value = nickname.value.trim()
  if (value.length > 64) {
    error.value = '昵称最多64个字符'
    return
  }
  const request = generation
  loading.value = true
  try {
    const profile = await getRuntimeServices().profile.update({
      nickname: value || null,
      avatar_object_key: avatarKey.value
    })
    if (request !== generation) return
    nickname.value = profile.nickname ?? ''
    avatarKey.value = profile.avatar_object_key ?? null
    error.value = ''
    uni.showToast({ icon: 'success', title: '资料已保存' })
  } catch {
    if (request === generation) error.value = '保存失败，请重试'
  } finally {
    if (request === generation) loading.value = false
  }
}
/** 离页取消迟到更新并清理本地头像临时预览 */
const cleanup = () => {
  generation++
  preview.value = ''
  ready.value = false
  loading.value = false
}
onShow(load)
onHide(cleanup)
onUnload(cleanup)
watch(() => useSessionStore().cleanupGeneration, cleanup, { flush: 'sync' })
</script>
<template>
  <PersonalPage title="昵称和头像" subtitle="主动设置个人资料，不影响学习。">
    <view class="profile-editor">
      <image v-if="preview" class="avatar-preview" :src="preview" mode="aspectFill" />
      <view v-else class="avatar-preview">芽</view>
      <button class="avatar-action" :disabled="loading || !ready" @click="chooseAvatar">
        选择头像
      </button>
      <!-- #ifdef MP-WEIXIN -->
      <button
        class="avatar-action"
        open-type="chooseAvatar"
        :disabled="loading || !ready"
        @chooseavatar="wechatAvatar"
      >
        使用微信头像
      </button>
      <!-- #endif -->
      <text class="field-label">昵称</text
      ><input
        type="nickname"
        maxlength="64"
        :value="nickname"
        placeholder="学习者"
        :disabled="loading || !ready"
        @input="inputNickname"
      />
      <text v-if="error" class="form-error">{{ error }}</text>
      <AppButton v-if="!ready" label="重新加载" @press="load" /><AppButton
        v-else
        label="保存资料"
        :loading="loading"
        @press="save"
      />
    </view>
  </PersonalPage>
</template>
<style scoped lang="scss">
.profile-editor {
  display: grid;
  gap: 14px;
  padding: 20px;
  border: 1px solid #d9e4d2;
  border-radius: 15px;
  background: #fffdf7;

  .avatar-preview {
    display: grid;
    width: 72px;
    height: 72px;
    place-items: center;
    margin: 0 auto;
    border-radius: 50%;
    background: #e2eed9;
    color: #254733;
    font-size: 26px;
  }

  .avatar-action {
    width: 100%;
    min-height: 44px;
    margin: 0;
    border-radius: 12px;
    background: #e2eed9;
    color: #254733;
    font-size: 14px;
    line-height: 44px;
  }

  .field-label {
    color: #254733;
    font-size: 14px;
  }

  input {
    height: 44px;
    padding: 0 12px;
    border: 1px solid #d9e4d2;
    border-radius: 10px;
    font-size: 16px;
  }

  .form-error {
    color: #a74936;
    font-size: 13px;
    line-height: 22px;
  }
}
</style>
