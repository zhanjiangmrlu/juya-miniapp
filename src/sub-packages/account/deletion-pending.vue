<script setup lang="ts">
import { onHide, onShow, onUnload } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

import AppButton from '@/components/app-button/app-button.vue'
import AppState from '@/components/app-state/app-state.vue'
import { reloadAfterDeletionRevoke } from '@/features/account/account-recovery'
import { presentDeletionState } from '@/features/account/deletion-presenter'
import PersonalPage from '@/features/profile/components/personal-page.vue'
import PersonalRow from '@/features/profile/components/personal-row.vue'
import PersonalSummary from '@/features/profile/components/personal-summary.vue'
import { useAnalyticsPage } from '@/services/analytics/use-analytics-page'
import { getRuntimeServices } from '@/services/runtime'
import { NavigationType } from '@/shared/enums/navigation'
import { ButtonVariant } from '@/shared/enums/ui'
import { navigate } from '@/shared/navigation/navigate'
import { createServerClock } from '@/shared/utils/server-clock'
import { useAccountDeletionStore } from '@/stores/account-deletion'
import { useFavoriteStore } from '@/stores/favorites'
import { useHomeStore } from '@/stores/home'
import { useLearningStore } from '@/stores/learning'
import { useSessionStore } from '@/stores/session'
import { useAccountRequestLifecycle } from '@/sub-packages/account/use-account-request-lifecycle'

import type { DeletionRequest } from '@/shared/contracts/account'
import type { ServerClock } from '@/shared/types/time'

const deletion = useAccountDeletionStore()
const error = ref('')
const loading = ref(false)
const revoked = ref(false)
const tick = ref(0)
const clock = ref<ServerClock>()
let timer: ReturnType<typeof globalThis.setInterval> | undefined
let visible = false
let generation = 0
const confirmed = ref(false)
const recoveryOwner = Symbol('account-deletion-recovery')
const lifecycle = useAccountRequestLifecycle(() => {
  visible = false
  generation++
  confirmed.value = false
  clock.value = undefined
  loading.value = false
  error.value = ''
  if (timer) globalThis.clearInterval(timer)
  timer = undefined
  useHomeStore().cancel(recoveryOwner)
  useLearningStore().cancel(recoveryOwner)
})
const view = computed(() => {
  void tick.value
  return confirmed.value && deletion.request
    ? presentDeletionState(deletion.request, clock.value || createServerClock())
    : undefined
})

/** 恢复最近注销响应；缺失时从本人档案补足当前服务端状态 */
const loadDeletion = async () => {
  const current = ++generation
  const owner = lifecycle.capture()
  if (timer) globalThis.clearInterval(timer)
  timer = undefined
  try {
    const runtime = getRuntimeServices()
    const [profile, entitlements] = await Promise.all([
      runtime.profile.get(),
      runtime.entitlements.get().catch(() => undefined)
    ])
    if (!visible || current !== generation || !lifecycle.isCurrent(owner)) return
    if (profile.juya_id !== useSessionStore().profile?.juya_id) {
      confirmed.value = false
      error.value = '账号身份已变化，请重新进入账号页面'
      return
    }
    clock.value = entitlements?.server_now
      ? createServerClock(new Date(entitlements.server_now))
      : undefined
    if (!profile.deletion) {
      deletion.clear()
      await navigate({ type: NavigationType.RE_LAUNCH, url: '/pages/profile/index' })
      return
    }
    deletion.save({
      completed_at: null,
      effective_at: profile.deletion.effective_at,
      id: '',
      requested_at: '',
      revoked_at: null,
      status: profile.deletion.status as DeletionRequest['status']
    })
    confirmed.value = true
    error.value = ''
  } catch {
    if (!visible || current !== generation || !lifecycle.isCurrent(owner)) return
    error.value = '账号状态刷新失败，请重试'
  }
  if (timer) globalThis.clearInterval(timer)
  timer = globalThis.setInterval(() => {
    tick.value += 1
  }, 1000)
}

/** 撤回注销后重新加载首页、目录、收藏、权益和本人状态 */
const revokeDeletion = async () => {
  if (loading.value || !view.value?.canRevoke) return
  const owner = lifecycle.capture()
  const current = ++generation
  loading.value = true
  error.value = ''
  try {
    await getRuntimeServices().account.revokeDeletion()
    if (!visible || current !== generation || !lifecycle.isCurrent(owner)) return
    if (timer) globalThis.clearInterval(timer)
    timer = undefined
    deletion.clear()
    confirmed.value = false
    revoked.value = true
    const runtime = getRuntimeServices()
    const session = useSessionStore()
    const favorites = useFavoriteStore()
    const home = useHomeStore()
    const learning = useLearningStore()
    await reloadAfterDeletionRevoke([
      async () => {
        const profile = await runtime.profile.get()
        if (visible && current === generation && lifecycle.isCurrent(owner))
          session.profile = profile
      },
      () => home.load(runtime.home, recoveryOwner),
      () => learning.load(runtime.catalog, recoveryOwner),
      () =>
        favorites.load(
          {
            ...runtime.favorites,
            /** 每页收藏只属于当前撤回会话，cursor 为已确认本人列表的服务端游标 */
            list: async (cursor) => {
              if (!lifecycle.isCurrent(owner)) throw new Error('ACCOUNT_REQUEST_CANCELLED')
              const page = await runtime.favorites.list(cursor)
              if (!lifecycle.isCurrent(owner)) throw new Error('ACCOUNT_REQUEST_CANCELLED')
              return page
            }
          },
          true
        ),
      () => runtime.entitlements.get()
    ])
    if (!visible || current !== generation || !lifecycle.isCurrent(owner)) return
    await navigate({ type: NavigationType.RE_LAUNCH, url: '/pages/profile/index' })
  } catch {
    if (!visible || current !== generation || !lifecycle.isCurrent(owner)) return
    error.value = revoked.value
      ? '注销已撤回，资料刷新失败，请重新加载'
      : '撤回失败，请重新加载确认服务端状态'
  } finally {
    if (lifecycle.isCurrent(owner)) loading.value = false
  }
}

/** 当前页重新显示时刷新服务端注销状态 */
onShow(async () => {
  lifecycle.activate()
  visible = true
  await loadDeletion()
})
/** 隐藏或销毁注销页时使旧响应失效并停止倒计时 */
const leave = () => {
  visible = false
  generation++
  if (timer) globalThis.clearInterval(timer)
  timer = undefined
  confirmed.value = false
  useHomeStore().cancel(recoveryOwner)
  useLearningStore().cancel(recoveryOwner)
}
onHide(leave)
onUnload(leave)
useAnalyticsPage('sub-packages/account/deletion-pending')
</script>
<template>
  <PersonalPage navigation="账号状态" title="账号注销期" subtitle="7 天内可以撤回注销"
    ><template v-if="view"
      ><PersonalSummary
        label="注销期还剩"
        :value="clock ? `${Math.ceil(view.remainingMs / 86400000)} 天` : '以服务端时间为准'"
        :note="`预计于 ${view.effectiveLabel} 结束`" /><text class="section-title"
        >当前可用操作</text
      ><view class="row-list"
        ><PersonalRow
          title="撤回注销"
          detail="撤回后恢复正常账号状态，限时学习倒计时不重置"
          :badge="view.canRevoke ? '可操作' : '已届满'"
          :actionable="view.canRevoke"
          @press="revokeDeletion" /><PersonalRow
          title="数据处理"
          detail="期满后无法恢复旧权益和记录"
          badge="说明" /><PersonalRow
          title="再次使用"
          detail="同一微信再次进入将按新用户处理"
          badge="说明" /></view
      ><text v-if="error" class="form-error">{{ error }}</text
      ><AppState
        v-if="!view.canRevoke"
        title="账号状态处理中"
        description="注销正在生效，当前阶段无法撤回"
        icon-label="处理中" /></template
    ><text v-if="error && !view" class="form-error">{{ error }}</text
    ><AppButton
      v-if="error"
      label="重新加载"
      :variant="ButtonVariant.SECONDARY"
      @press="loadDeletion" /><template #actions
      ><AppButton
        v-if="view?.canRevoke"
        label="撤回注销"
        :loading="loading"
        @press="revokeDeletion" /></template
  ></PersonalPage>
</template>
<style scoped lang="scss">
@use '../../features/profile/personal';
</style>
