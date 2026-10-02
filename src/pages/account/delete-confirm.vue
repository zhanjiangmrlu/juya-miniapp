<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'

import AppButton from '@/components/app-button/app-button.vue'
import { loadAccountMetrics } from '@/features/account/account-metrics'
import {
  clearLocalDeletionDrafts,
  createUniLocalDataScope
} from '@/features/account/local-data-cleaner'
import {
  type EntitlementsViewModel,
  presentEntitlements
} from '@/features/entitlements/entitlement-presenter'
import PersonalPage from '@/features/profile/components/personal-page.vue'
import PersonalRow from '@/features/profile/components/personal-row.vue'
import PersonalSummary from '@/features/profile/components/personal-summary.vue'
import { getRuntimeServices } from '@/services/runtime'
import { navigate } from '@/shared/navigation/navigate'
import { createServerClock } from '@/shared/utils/server-clock'
import { useAccountDeletionStore } from '@/stores/account-deletion'
const deletion = useAccountDeletionStore()
const error = ref('')
const loading = ref(false)
const loaded = ref(false)
const openCount = ref(0)
const metrics = ref({ totalDays: 0, currentStreak: 0, favoriteCount: 0, completedScenes: 0 })
const rights = ref<EntitlementsViewModel>({ authorizationPending: false, formal: [], limited: [] })
/** 读取本人完整收藏、已完成场景、当前打卡与最新权益 */
const load = async () => {
  loaded.value = false
  try {
    const runtime = getRuntimeServices()
    const [stats, dto, directory] = await Promise.all([
      loadAccountMetrics(runtime),
      runtime.entitlements.get(),
      runtime.catalog.getCatalog()
    ])
    openCount.value = directory.items.filter((item) => item.access === 'OPEN').length
    metrics.value = stats
    rights.value = presentEntitlements(
      dto,
      createServerClock(dto.server_now ? new Date(dto.server_now) : undefined)
    )
    loaded.value = true
    error.value = ''
  } catch {
    error.value = '学习数据读取失败，请重试后再申请注销'
  }
}
/** 保留账号并回到首页继续学习 */
const keepAccount = () => navigate({ type: 'reLaunch', url: '/pages/home/index' })
/** 经当前确认页再次确认后申请注销，受理成功才清除敏感本地草稿 */
const requestDeletion = async () => {
  if (loading.value || !loaded.value) return
  loading.value = true
  error.value = ''
  try {
    const accepted = await getRuntimeServices().account.requestDeletion()
    deletion.save(accepted)
    clearLocalDeletionDrafts(createUniLocalDataScope())
    await navigate({ type: 'redirectTo', url: '/pages/account/deletion-pending' })
  } catch {
    error.value = '暂时无法申请注销，请稍后重试'
  } finally {
    loading.value = false
  }
}
onShow(load)
</script>
<template>
  <PersonalPage
    navigation="注销账号"
    title="保留你的学习积累"
    subtitle="注销前请确认当前成果与权益"
  >
    <PersonalSummary
      label="已坚持学习"
      :value="`${metrics.totalDays} 天`"
      note="收藏和学习进度将随账号删除"
    />
    <view class="account-stats"
      ><view
        ><text>{{ metrics.currentStreak }}</text
        ><text>连续学习天数</text></view
      ><view
        ><text>{{ metrics.favoriteCount }}</text
        ><text>收藏内容</text></view
      ><view
        ><text>{{ metrics.completedScenes }}</text
        ><text>完成场景</text></view
      ></view
    >
    <text class="section-title">当前有效权益</text>
    <view class="row-list"
      ><PersonalRow
        v-if="openCount"
        title="开放场景"
        detail="仍可自由学习"
        badge="有效"
        size="small"
      />
      <PersonalRow
        v-for="item in rights.formal.filter((item) => item.canOpenContent)"
        :key="item.id"
        :title="item.title"
        :detail="item.expires_at ? '有效至 ' + item.expires_at.slice(0, 10) : '永久有效'"
        badge="有效"
        size="small"
      />
      <PersonalRow
        v-for="item in rights.limited.filter((item) => item.canOpenContent)"
        :key="item.id"
        :title="item.title"
        :detail="item.expiresAt ? '有效至 ' + item.expiresAt.slice(0, 10) : '以服务端期限为准'"
        badge="有效"
        size="small"
      />
      <PersonalRow
        v-if="
          !openCount &&
          !rights.formal.some((item) => item.canOpenContent) &&
          !rights.limited.some((item) => item.canOpenContent)
        "
        title="当前无有效学习权益"
        detail="以最新服务端状态为准"
        size="small"
      />
    </view>
    <view class="delete-warning"
      ><text>注销生效后，身份、联系资料、收藏、进度、打卡及权益关联将删除或匿名化。</text
      ><text>提交后有 7 天冷静期，可在生效前撤回。</text></view
    >
    <text v-if="error" class="form-error">{{ error }}</text
    ><AppButton v-if="!loaded" label="重新读取学习数据" variant="secondary" @press="load" />
    <template #actions
      ><AppButton
        class="deletion-action"
        label="继续注销"
        variant="secondary"
        :disabled="!loaded"
        :loading="loading"
        @press="requestDeletion" /><AppButton label="保留账号，继续学习" @press="keepAccount"
    /></template>
  </PersonalPage>
</template>
<style scoped lang="scss">
@use '../../features/profile/personal';

.account-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 10px;

  view {
    display: flex;
    min-height: 84px;
    flex-direction: column;
    align-items: center;
    padding: 8px 4px;
    border: 1px solid #d6dfc9;
    border-radius: 12px;
    background: #fffdf7;

    text:first-child {
      color: #4e7f3b;
      font-size: 26px;
      font-weight: 700;
      line-height: 39px;
    }

    text:last-child {
      margin-top: 2px;
      color: #5c715e;
      font-size: 11px;
      line-height: 23px;
    }
  }
}

.section-title {
  margin-top: 9px;
}

.row-list {
  gap: 7px;
}

:deep(.deletion-action) {
  border: 1px solid #bf5d48;
  color: #a8432e;
}

.delete-warning {
  margin-top: 9px;
  min-height: 62px;
  padding: 3px 13px 6px;
  border: 1px solid #edc6b8;
  border-radius: 11px;
  background: #fcede6;
  color: #765d54;
  font-size: 11px;
  line-height: 19px;

  text {
    display: block;
  }

  .warning-title {
    min-height: 23px;
    color: #b4462d;
    font-size: 13px;
    font-weight: 700;
    line-height: 23px;
  }
}
</style>
