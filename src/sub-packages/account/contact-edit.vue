<script setup lang="ts">
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

import AppPage from '@/components/app-page/app-page.vue'
import AppReturnBarrier from '@/components/app-return-barrier/app-return-barrier.vue'
import AppState from '@/components/app-state/app-state.vue'
import AppUnsavedDialog from '@/components/app-unsaved-dialog/app-unsaved-dialog.vue'
import { useUnsavedGuard } from '@/composables/use-unsaved-guard'
import { contactChange, rebaseContact } from '@/features/profile/contact-model'
import { operations } from '@/services/api'
import { ApiError, isUnconfirmedFailure } from '@/services/errors'
import { Routes } from '@/shared/constants/navigation'
import { useAccountStore } from '@/stores/account-store'

import type { AccountProfile } from '@/shared/types/account'
const account = useAccountStore(),
  base = ref<AccountProfile | null>(null),
  phone = ref(''),
  wechat = ref(''),
  loading = ref(true),
  busy = ref(false),
  unknown = ref(false),
  error = ref(''),
  fieldError = ref<Record<string, string>>({})
let alive = true
const conflict = ref(false),
  rebased = ref(false)
const dirty = computed(
  () =>
    !!base.value &&
    (phone.value.trim() !== (base.value.phone || '') ||
      wechat.value.trim() !== (base.value.wechat_contact || ''))
)
/** 将服务器新资料作为明确编辑基准
 * @param value 本人已确认资料
 */
const accept = (value: AccountProfile) => {
  base.value = value
  phone.value = value.phone || ''
  wechat.value = value.wechat_contact || ''
  account.acceptProfile(value)
  unknown.value = false
  conflict.value = false
}
/** 重新获取时不自动提交原输入 */
const load = async () => {
  loading.value = true
  error.value = ''
  try {
    if (await account.ensure(Routes.PROFILE)) {
      const value = await account.restore()
      if (alive && value) accept(value)
    }
  } catch (reason) {
    if (alive) error.value = reason instanceof Error ? reason.message : '资料暂未获取'
  } finally {
    if (alive) loading.value = false
  }
}
/** 以一个版本和一个幂等键提交实际变更，不拆分两个字段 */
const save = async () => {
  if (!base.value || busy.value) return false
  error.value = ''
  fieldError.value = {}
  let body
  try {
    body = contactChange(base.value, { phone: phone.value, wechat_contact: wechat.value })
  } catch (reason) {
    if (reason instanceof ApiError) {
      fieldError.value[reason.details[0]?.field || 'phone'] = reason.message
    } else error.value = '请核对填写内容'
    return false
  }
  if (!body) return true
  busy.value = true
  try {
    const value = await operations.run<AccountProfile>(
      'contact-save',
      '/api/mini/v1/me/contact',
      'PATCH',
      body
    )
    if (alive) accept(value)
    return true
  } catch (reason) {
    if (alive) {
      error.value = reason instanceof Error ? reason.message : '保存暂未成功，请重试'
      unknown.value = isUnconfirmedFailure(reason)
      conflict.value = reason instanceof ApiError && reason.code === 'contact_changed'
      if (reason instanceof ApiError && reason.details[0]?.field)
        fieldError.value[reason.details[0].field] = reason.message
    }
    return false
  } finally {
    if (alive) busy.value = false
  }
}
/** 明确刷新版本时保留手动改动，未改字段跟随服务器当前值 */
const reloadLatest = async () => {
  if (!base.value || busy.value) return
  busy.value = true
  error.value = ''
  const previous = base.value,
    draft = { phone: phone.value, wechat_contact: wechat.value }
  try {
    const latest = await account.restore()
    if (alive && latest) {
      const value = rebaseContact(previous, draft, latest)
      base.value = latest
      phone.value = value.phone
      wechat.value = value.wechat_contact
      conflict.value = false
      unknown.value = false
      rebased.value = true
      fieldError.value = {}
    }
  } catch (reason) {
    if (alive) error.value = reason instanceof Error ? reason.message : '资料暂未获取'
  } finally {
    if (alive) busy.value = false
  }
}
const guard = useUnsavedGuard(dirty, busy, save, Routes.PROFILE)
/** 正常保存成功后回到只读资料页 */
const saveAndLeave = async () => {
  if (await save()) await guard.leaveNow()
}
/** 未知响应先查询服务端结果，再决定是否重试 */
const recover = async () => {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    const value = await operations.recover<AccountProfile>('contact-save')
    if (value && alive) {
      const wanted = contactChange(base.value!, {
        phone: phone.value,
        wechat_contact: wechat.value
      })
      const matches =
        !wanted ||
        ((wanted.phone === undefined || (value.phone || '') === wanted.phone) &&
          (wanted.wechat_contact === undefined ||
            (value.wechat_contact || '') === wanted.wechat_contact))
      if (matches) {
        accept(value)
        await guard.leaveNow()
      } else {
        busy.value = false
        await reloadLatest()
        error.value = '上次提交已确认，当前输入尚未提交，请核对后保存'
      }
    } else error.value = '尚未查询到保存结果，可重试原操作'
  } catch (reason) {
    if (alive) error.value = reason instanceof Error ? reason.message : '结果尚未确认，可重试原操作'
  } finally {
    if (alive) busy.value = false
  }
}
onLoad(() => {
  void load()
})
onUnload(() => {
  alive = false
  phone.value = ''
  wechat.value = ''
  base.value = null
})
</script>
<template>
  <AppPage
    title="联系方式"
    back
    footer
    custom-back
    :fallback="Routes.PROFILE"
    @back="guard.requestBack"
    ><AppState
      v-if="!guard.canEdit.value"
      error="当前微信版本不支持安全返回，请升级微信后编辑资料" /><AppState
      :busy="loading"
      :error="!base ? error : ''"
      @retry="load" /><template v-if="base && !loading && guard.canEdit.value"
      ><view class="notice"
        >联系方式选填，不影响学习。手动填写暂不验证归属，仅用于你主动提供的后续联系与服务。</view
      >
      <view v-if="rebased" class="notice"
        >已获取当前资料，保留了你手动修改的字段，请核对后再保存。<text v-if="base.phone"
          >当前已保存手机号：{{ base.phone }}</text
        ><text v-if="base.wechat_contact">当前已保存微信号：{{ base.wechat_contact }}</text></view
      >
      <label class="field"
        ><text class="field-label">手机号（选填）</text
        ><input
          v-model="phone"
          type="number"
          :maxlength="32"
          :disabled="busy || unknown"
          placeholder="请输入11位大陆手机号"
        /><text v-if="fieldError.phone" class="field-error">{{ fieldError.phone }}</text></label
      ><label class="field"
        ><text class="field-label">微信号（选填）</text
        ><input
          v-model="wechat"
          :maxlength="64"
          :disabled="busy || unknown"
          placeholder="6–20位，以字母开头"
        /><text v-if="fieldError.wechat_contact" class="field-error">{{
          fieldError.wechat_contact
        }}</text></label
      ><text class="help"
        >已有联系方式不能通过清空删除，可以保留或修改。没有填写过的字段可以继续留空。</text
      ><view v-if="error" class="notice error"
        >{{ error
        }}<button v-if="conflict" class="text-button" :disabled="busy" @click="reloadLatest">
          重新获取并核对</button
        ><button v-if="unknown" class="text-button" :disabled="busy" @click="recover">
          查询保存结果
        </button></view
      ></template
    ><template #footer
      ><view v-if="base && !loading && guard.canEdit.value" class="safe-footer"
        ><button :disabled="busy" @click="guard.requestBack">取消</button
        ><button
          class="primary"
          :disabled="busy || (!dirty && !unknown)"
          :loading="busy"
          @click="saveAndLeave"
        >
          {{ unknown ? '重试保存' : '保存' }}
        </button></view
      ></template
    ><AppReturnBarrier
      v-if="guard.canEdit.value"
      :show="guard.nativeShow.value"
      @beforeleave="guard.nativeBeforeLeave"
      @afterleave="guard.nativeAfterLeave" /><AppUnsavedDialog
      v-if="guard.open.value"
      :busy="busy"
      :unknown="unknown"
      @choose="guard.choose"
  /></AppPage>
</template>
<style scoped lang="scss">
.field-error {
  display: block;
  font-size: 24rpx;
  color: #a23f35;
  margin-top: 12rpx;
}

.help {
  display: block;
  color: #637268;
  font-size: 24rpx;
  line-height: 1.9;
  margin-top: 40rpx;
  margin-bottom: 36rpx;
}
</style>
