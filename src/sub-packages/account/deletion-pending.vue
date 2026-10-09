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
const view = computed(() => {
  void tick.value
  return deletion.request
    ? presentDeletionState(deletion.request, clock.value || createServerClock())
    : undefined
})

/** 恢复最近注销响应；缺失时从本人档案补足当前服务端状态 */
const loadDeletion = async () => {
  const current = ++generation
  if (timer) globalThis.clearInterval(timer)
  timer = undefined
  deletion.restore()
  try {
    const runtime = getRuntimeServices()
    const [profile, entitlements] = await Promise.all([
      runtime.profile.get(),
      runtime.entitlements.get().catch(() => undefined)
    ])
    if (!visible || current !== generation) return
    clock.value = entitlements?.server_now
      ? createServerClock(new Date(entitlements.server_now))
      : undefined
    if (!profile.deletion) {
      deletion.clear()
      await navigate({ type: NavigationType.RE_LAUNCH, url: '/sub-packages/profile/index' })
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
    error.value = ''
  } catch {
    if (!visible || current !== generation) return
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
  loading.value = true
  error.value = ''
  try {
    await getRuntimeServices().account.revokeDeletion()
    generation++
    if (timer) globalThis.clearInterval(timer)
    timer = undefined
    deletion.clear()
    revoked.value = true
    const runtime = getRuntimeServices()
    const session = useSessionStore()
    const favorites = useFavoriteStore()
    const home = useHomeStore()
    const learning = useLearningStore()
    await reloadAfterDeletionRevoke([
      async () => {
        session.profile = await runtime.profile.get()
      },
      () => home.load(runtime.home),
      () => learning.load(runtime.catalog),
      () => favorites.load(runtime.favorites, true),
      () => runtime.entitlements.get()
    ])
    await navigate({ type: NavigationType.RE_LAUNCH, url: '/sub-packages/profile/index' })
  } catch {
    error.value = revoked.value
      ? '注销已撤回，资料刷新失败，请重新加载'
      : '撤回失败，请重新加载确认服务端状态'
  } finally {
    loading.value = false
  }
}

/** 当前页重新显示时刷新服务端注销状态 */
onShow(async () => {
  visible = true
  await loadDeletion()
})
/** 隐藏或销毁注销页时使旧响应失效并停止倒计时 */
const leave = () => {
  visible = false
  generation++
  if (timer) globalThis.clearInterval(timer)
  timer = undefined
}
onHide(leave)
onUnload(leave)
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
