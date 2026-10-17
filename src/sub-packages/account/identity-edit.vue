<script setup lang="ts">
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

import AppAvatar from '@/components/app-avatar/app-avatar.vue'
import AppPage from '@/components/app-page/app-page.vue'
import AppState from '@/components/app-state/app-state.vue'
import AppUnsavedDialog from '@/components/app-unsaved-dialog/app-unsaved-dialog.vue'
import { useUnsavedGuard } from '@/composables/use-unsaved-guard'
import { rebaseIdentity } from '@/features/profile/identity-model'
import { operations, session } from '@/services/api'
import { ApiError, isUnconfirmedFailure } from '@/services/errors'
import { operationKey } from '@/services/platform'
import { Routes } from '@/shared/constants/navigation'
import { MediaState } from '@/shared/enums/media'
import { useAccountStore } from '@/stores/account-store'

import type { components } from '@/shared/contracts/generated/mini-api'
import type { AccountProfile } from '@/shared/types/account'
import type { AvatarChoiceEvent } from '@/shared/types/ui'
const account = useAccountStore(),
  base = ref<AccountProfile | null>(null),
  nickname = ref(''),
  avatarId = ref<string | null>(null),
  preview = ref(''),
  selectedPath = ref(''),
  uploading = ref(false),
  saving = ref(false),
  percent = ref(0),
  error = ref(''),
  uploadError = ref(''),
  loading = ref(true),
  unknown = ref(false),
  limit = ref(0)
let alive = true,
  uploadKey = ''
const conflict = ref(false),
  rebased = ref(false)
const busy = computed(() => uploading.value || saving.value)
const dirty = computed(
  () =>
    !!base.value &&
    ((nickname.value.trim() || '学习者') !== base.value.nickname ||
      avatarId.value !== base.value.avatar_id ||
      !!selectedPath.value)
)
/** 加载本人资料与服务器配置的头像限制 */
const load = async () => {
  loading.value = true
  error.value = ''
  try {
    if (await account.ensure(Routes.PROFILE)) {
      const [value, configuration] = await Promise.all([
        account.restore(),
        session.request<components['schemas']['ClientConfiguration']>('/api/mini/v1/configuration')
      ])
      if (!alive) return
      limit.value = configuration.avatar_limit_bytes
      if (value) {
        base.value = value
        nickname.value = value.nickname
        avatarId.value = value.avatar_id
      }
      await account.refreshAvatar()
      preview.value = account.avatarURL
    }
  } catch (reason) {
    if (alive) error.value = reason instanceof Error ? reason.message : '个人资料暂未获取'
  } finally {
    if (alive) loading.value = false
  }
}
/** 上传完成后才允许保存新头像，失败保留选择以便重试 */
const upload = async () => {
  if (!selectedPath.value || busy.value) return
  uploading.value = true
  percent.value = 0
  uploadError.value = ''
  try {
    const size = await new Promise<number>((resolve, reject) =>
      uni.getFileInfo({
        filePath: selectedPath.value,
        success: (result) => resolve(result.size),
        fail: () => reject(new Error('暂未读取图片，请重新选择'))
      })
    )
    if (size > limit.value)
      throw new Error(`头像不能超过 ${Math.floor(limit.value / 1024 / 1024)} MB`)
    let value = await session.request<components['schemas']['AvatarUpload']>(
      '/api/mini/v1/me/avatar',
      {
        method: 'POST',
        key: uploadKey,
        body: {
          file_path: selectedPath.value,
          progress: (value: number) => {
            if (alive) percent.value = value
          }
        }
      }
    )
    while (alive && value.state !== MediaState.READY && value.state !== MediaState.FAILED) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      if (!alive) return
      value = await session.request(`/api/mini/v1/me/avatar/${value.id}/status`)
    }
    if (!alive) return
    if (value.state !== MediaState.READY) throw new Error('头像处理暂未成功，请重试')
    avatarId.value = value.id
  } catch (reason) {
    if (alive) uploadError.value = reason instanceof Error ? reason.message : '头像上传失败，请重试'
  } finally {
    if (alive) uploading.value = false
  }
}
/** 只使用用户主动选择的头像，不自动获取微信资料
 * @param path 平台返回的本地临时图片
 */
const selectImage = (path: string) => {
  if (!path || busy.value) return
  selectedPath.value = path
  uploadKey = operationKey()
  preview.value = path
  avatarId.value = base.value?.avatar_id || null
  void upload()
}
/** 微信主动头像选择事件
 * @param event 用户确认的临时头像文件
 */
const chooseAvatar = (event: AvatarChoiceEvent) => selectImage(event.detail.avatarUrl)
/** Web预览和不支持选择能力时，由用户明确选择本地图片 */
const chooseImage = () =>
  uni.chooseImage({
    count: 1,
    sizeType: ['original'],
    sourceType: ['album'],
    success: (result) => selectImage(result.tempFilePaths[0] || '')
  })
/** 保存完成的头像与昵称，旧有效资料直到成功才替换 */
const save = async () => {
  if (!base.value || busy.value) return false
  if (uploadError.value || (selectedPath.value && avatarId.value === base.value.avatar_id)) {
    error.value = '请先完成头像上传，再保存资料'
    return false
  }
  if (!dirty.value) return true
  saving.value = true
  error.value = ''
  try {
    const value = await operations.run<AccountProfile>(
      'profile-save',
      '/api/mini/v1/me/profile',
      'PATCH',
      { version: base.value.profile_version, nickname: nickname.value, avatar_id: avatarId.value }
    )
    if (alive) {
      base.value = value
      account.acceptProfile(value)
      nickname.value = value.nickname
      avatarId.value = value.avatar_id
      selectedPath.value = ''
      unknown.value = false
    }
    return true
  } catch (reason) {
    if (alive) {
      error.value = reason instanceof Error ? reason.message : '保存暂未成功'
      unknown.value = isUnconfirmedFailure(reason)
      conflict.value = reason instanceof ApiError && reason.code === 'profile_changed'
    }
    return false
  } finally {
    if (alive) saving.value = false
  }
}
/** 明确获取新版本时不覆盖当前手动输入或所选头像 */
const reloadLatest = async () => {
  if (!base.value || busy.value) return
  saving.value = true
  error.value = ''
  const previous = base.value,
    draft = { nickname: nickname.value, avatar_id: avatarId.value },
    selected = !!selectedPath.value
  try {
    const latest = await account.restore()
    if (!alive || !latest) return
    const value = rebaseIdentity(previous, draft, latest, selected)
    base.value = latest
    nickname.value = value.nickname
    avatarId.value = value.avatar_id
    conflict.value = false
    unknown.value = false
    rebased.value = true
    if (!selected && value.avatar_id === latest.avatar_id) {
      await account.refreshAvatar()
      preview.value = account.avatarURL
    }
  } catch (reason) {
    if (alive) error.value = reason instanceof Error ? reason.message : '资料暂未获取'
  } finally {
    if (alive) saving.value = false
  }
}
const guard = useUnsavedGuard(dirty, busy, save, Routes.PROFILE)
/** 正常保存成功后回到只读资料页 */
const saveAndLeave = async () => {
  if (await save()) await guard.leaveNow()
}
/** 响应未知时查询原操作，不把临时预览当成已保存头像 */
const recover = async () => {
  if (busy.value) return
  saving.value = true
  error.value = ''
  try {
    const value = await operations.recover<AccountProfile>('profile-save')
    if (value && alive) {
      if (
        value.nickname === (nickname.value.trim() || '学习者') &&
        value.avatar_id === avatarId.value
      ) {
        base.value = value
        account.acceptProfile(value)
        selectedPath.value = ''
        unknown.value = false
        await guard.leaveNow()
      } else {
        saving.value = false
        await reloadLatest()
        error.value = '上次提交已确认，当前输入尚未提交，请核对后保存'
      }
    } else error.value = '尚未查询到结果，可重试原操作'
  } catch (reason) {
    if (alive) error.value = reason instanceof Error ? reason.message : '结果暂未确认'
  } finally {
    if (alive) saving.value = false
  }
}
onLoad(() => {
  void load()
})
onUnload(() => {
  alive = false
  nickname.value = ''
  selectedPath.value = ''
  preview.value = ''
  base.value = null
})
</script>
<template>
  <AppPage
    title="个人资料"
    back
    footer
    custom-back
    :fallback="Routes.PROFILE"
    @back="guard.requestBack"
    ><AppState :busy="loading" :error="!base ? error : ''" @retry="load" /><template
      v-if="base && !loading"
      ><view class="identity-photo"
        ><AppAvatar :src="preview" :size="192" /><!-- #ifdef MP-WEIXIN --><button
          class="text-button"
          open-type="chooseAvatar"
          :disabled="busy || unknown"
          @chooseavatar="chooseAvatar"
        >
          选择头像</button
        ><!-- #endif --><!-- #ifndef MP-WEIXIN --><button
          class="text-button"
          :disabled="busy || unknown"
          @click="chooseImage"
        >
          选择头像</button
        ><!-- #endif --><text class="photo-help"
          >主动选择图片，保存后更新头像 · 最大 {{ Math.floor(limit / 1024 / 1024) }} MB</text
        ><text v-if="uploading" class="upload-progress">{{
          percent < 100 ? `上传中 ${percent}%` : '正在处理头像…'
        }}</text
        ><view v-if="uploadError" class="notice error"
          >{{ uploadError
          }}<button class="text-button" :disabled="busy" @click="upload">重试上传</button></view
        ></view
      ><view v-if="rebased" class="notice"
        >已获取服务器当前资料，保留了你的修改。当前已保存昵称：{{
          base.nickname
        }}。请核对后再保存。</view
      ><label class="field"
        ><text class="field-label">昵称</text
        ><input
          v-model="nickname"
          type="nickname"
          :maxlength="80"
          :disabled="busy || unknown"
          placeholder="请输入昵称，留空显示学习者" /></label
      ><text class="account-note">头像和昵称仅用于展示，不会改变你的账号身份、学习记录或收藏。</text
      ><view v-if="error" class="notice error"
        >{{ error
        }}<button v-if="conflict" class="text-button" :disabled="busy" @click="reloadLatest">
          重新获取并核对</button
        ><button v-if="unknown" class="text-button" :disabled="busy" @click="recover">
          查询保存结果
        </button></view
      ></template
    ><template #footer
      ><view v-if="base && !loading" class="safe-footer"
        ><button :disabled="busy" @click="guard.requestBack">取消</button
        ><button
          class="primary"
          :disabled="busy || !dirty || !!uploadError"
          :loading="saving"
          @click="saveAndLeave"
        >
          {{ unknown ? '重试保存' : '保存' }}
        </button></view
      ></template
    ><AppUnsavedDialog
      v-if="guard.open.value"
      :busy="busy"
      :unknown="unknown"
      @choose="guard.choose"
  /></AppPage>
</template>
<style scoped lang="scss">
.identity-photo {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 0 48rpx;

  .text-button {
    margin-top: 16rpx;
  }

  .photo-help {
    font-size: 24rpx;
    color: #637268;
    text-align: center;
    line-height: 1.8;
  }

  .upload-progress {
    font-size: 24rpx;
    color: #347553;
    margin-top: 16rpx;
  }

  .notice {
    margin-top: 24rpx;
    width: 100%;
  }
}

.account-note {
  display: block;
  color: #637268;
  font-size: 24rpx;
  line-height: 1.9;
  margin: 48rpx 0 36rpx;
}
</style>
