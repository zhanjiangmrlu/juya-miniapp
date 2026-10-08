<script setup lang="ts">
import { onLoad, onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

import AppButton from '@/components/app-button/app-button.vue'
import AppState from '@/components/app-state/app-state.vue'
import {
  type EntitlementsViewModel,
  type LimitedEntitlementViewModel,
  presentEntitlements
} from '@/features/entitlements/entitlement-presenter'
import PersonalPage from '@/features/profile/components/personal-page.vue'
import PersonalRow from '@/features/profile/components/personal-row.vue'
import PersonalSummary from '@/features/profile/components/personal-summary.vue'
import { getRuntimeServices } from '@/services/runtime'
import { navigate } from '@/shared/navigation/navigate'
import { createServerClock } from '@/shared/utils/server-clock'

import type { SceneSummary } from '@/shared/contracts/learning'
const props = withDefaults(
  defineProps<{ state?: LimitedEntitlementViewModel['state'] | 'ALL'; title?: string }>(),
  { state: 'ALL', title: '我的学习权益' }
)
const view = ref<EntitlementsViewModel>({ authorizationPending: false, formal: [], limited: [] })
const catalog = ref<SceneSummary[]>([])
const selectedId = ref('')
const result = computed(() => selected.value?.achievements)
const error = ref('')
const selected = computed(() =>
  selectedId.value
    ? view.value.limited.find((item) => item.id === selectedId.value)
    : view.value.limited.find((item) => item.state === props.state)
)
const stateCopy = computed(
  () =>
    ({
      ALL: ['我的学习权益', '不同权益分别展示状态与期限', '权益分区', '前往场景学习'],
      PENDING: [
        '限时学习待开始',
        `${selected.value?.durationDays || ''} 天活动 · 首次打开场景后开始计时`,
        '本次开放场景',
        '开始学习'
      ],
      ACTIVE: [
        '限时学习中',
        `${selected.value?.durationDays || ''} 天活动 · 场景已全部开放`,
        '继续学习',
        '继续学习'
      ],
      ENDING: [
        '即将结束',
        `${selected.value?.durationDays || ''} 天限时学习 · 即将结束`,
        '最后的学习时间',
        '继续学习'
      ],
      ENDED: ['限时学习已结束', '成果与收藏仍可查看', '查看保留内容', '查看学习记录'],
      EXCEPTION: ['限时权益状态', '当前不可进入完整活动内容', '你仍可以查看', '查看学习历史']
    })[props.state]
)
/** 将服务端绝对时间显示为北京时间，value 为启动或结束时刻 */
const formatTime = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('zh-CN', {
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Shanghai'
      }).format(new Date(value))
    : '以服务端状态为准'
const summary = computed(() => {
  if (props.state === 'ALL')
    return {
      label: '开放场景',
      value: `${catalog.value.filter((item) => item.access === 'OPEN').length} 个`,
      note: '当前均可学习'
    }
  if (props.state === 'ENDED')
    return {
      label: '本次成果',
      value: `${result.value?.learning_days ?? '—'} 天`,
      note: '实际学习天数'
    }
  if (props.state === 'EXCEPTION')
    return {
      label: '当前状态',
      value: view.value.authorizationPending
        ? '待确认'
        : selected.value?.status === 'PAUSED'
          ? '已暂停'
          : selected.value?.status === 'REVOKED'
            ? '已撤销'
            : selected.value?.status === 'START_EXPIRED'
              ? '已过启动截止'
              : '暂不可用',
      note: '收藏、进度和历史成果继续保留'
    }
  return {
    label:
      props.state === 'PENDING'
        ? '启动截止'
        : props.state === 'ENDING'
          ? '学习权益将于'
          : '结束时间',
    value: formatTime(
      props.state === 'PENDING' ? selected.value?.startsBefore : selected.value?.expiresAt
    ),
    note:
      props.state === 'PENDING'
        ? '请在截止前首次打开任一活动场景'
        : props.state === 'ACTIVE'
          ? '按服务端时间计算，进度和收藏会保留'
          : '收藏和学习进度会继续保留。'
  }
})
const limitedScenes = computed(() =>
  catalog.value.filter((item) => selected.value?.sceneIds.includes(item.scene_id))
)
const preserved = computed(() =>
  props.state === 'EXCEPTION'
    ? [
        {
          title: '学习历史',
          route: '/pages/favorites/history',
          detail: '查看完成场景和历史进度',
          badge: '仅摘要'
        },
        {
          title: '词汇银行',
          route: '/pages/favorites/index',
          detail: '已收藏词汇继续保留',
          badge: '可查看'
        },
        {
          title: '语块银行',
          route: '/pages/favorites/phrases',
          detail: '已收藏语块继续保留',
          badge: '可查看'
        }
      ]
    : [
        {
          title: '收藏词汇',
          route: '/pages/favorites/index',
          detail:
            props.state === 'ENDED' && result.value
              ? `${result.value.favorite_vocabulary} 条 · 进入词汇银行`
              : '已收藏词汇继续保留',
          badge: '›'
        },
        {
          title: '收藏语块',
          route: '/pages/favorites/phrases',
          detail:
            props.state === 'ENDED' && result.value
              ? `${result.value.favorite_phrases} 条 · 进入语块银行`
              : '已收藏语块继续保留',
          badge: '›'
        },
        {
          title: '学习过的场景',
          route: '/pages/favorites/history',
          detail: '查看完成场景和历史进度',
          badge: '›'
        }
      ]
)
/** 读取最新权益与场景摘要，并保留服务器提供的激活与结束时刻 */
const load = async () => {
  try {
    const runtime = getRuntimeServices()
    const [dto, directory] = await Promise.all([
      runtime.entitlements.get(),
      runtime.catalog.getCatalog()
    ])
    view.value = presentEntitlements(
      dto,
      createServerClock(dto.server_now ? new Date(dto.server_now) : undefined)
    )
    if (props.state !== 'ALL' && selected.value && selected.value.state !== props.state) {
      await navigate({
        type: 'redirectTo',
        url: `/pages/entitlement/${selected.value.state.toLocaleLowerCase()}?id=${encodeURIComponent(selected.value.id)}`
      })
      return
    }
    catalog.value = directory.items
    error.value = ''
  } catch {
    error.value = '权益读取失败，请重试'
  }
}
/** 按权益投影进入状态页，item 为选中限时权益 */
const openItem = (item: LimitedEntitlementViewModel) =>
  navigate({
    type: 'navigateTo',
    url: `/pages/entitlement/${item.state.toLocaleLowerCase()}?id=${encodeURIComponent(item.id)}`
  })
/** 打开站内明细，url 为收藏或历史地址 */
const open = (url: string) => navigate({ type: 'navigateTo', url })
/** 从状态页前往目录或只读历史，不在此页激活限时权益 */
const action = () =>
  props.state === 'PENDING' && limitedScenes.value[0]
    ? openScene(limitedScenes.value[0])
    : ['ENDED', 'EXCEPTION'].includes(props.state)
      ? open('/pages/favorites/history')
      : navigate({ type: 'reLaunch', url: '/pages/learning/index' })
/** 打开服务器目录仍可学习的场景，item 为当前场景摘要 */
const openScene = (item: SceneSummary) => {
  if (
    !view.value.authorizationPending &&
    ['PENDING', 'ACTIVE', 'ENDING'].includes(props.state) &&
    selected.value?.sceneIds.includes(item.scene_id) &&
    (props.state === 'PENDING' || ['OPEN', 'FORMAL', 'LIMITED'].includes(item.access))
  )
    void open(`/pages/scene/detail?sceneId=${encodeURIComponent(item.scene_id)}`)
}
onLoad((query) => {
  selectedId.value = query?.id || ''
})
onShow(load)
</script>
<template>
  <PersonalPage
    :title="stateCopy[0] || title"
    :navigation="state === 'ALL' ? '学习权益' : state === 'ENDED' ? '学习成果' : '限时学习'"
    :subtitle="stateCopy[1] || ''"
  >
    <PersonalSummary v-bind="summary" :compact="['PENDING', 'ACTIVE', 'ENDING'].includes(state)" />
    <view v-if="state === 'ENDED'" class="result-grid"
      ><view
        ><text>{{ result?.completed_scenes ?? '—' }}</text
        ><text>完成场景</text></view
      ><view
        ><text>{{ result?.learning_days ?? '—' }}</text
        ><text>实际学习天数</text></view
      ><view
        ><text>{{ result ? result.favorite_vocabulary + result.favorite_phrases : '—' }}</text
        ><text>收藏内容</text></view
      ></view
    >
    <text class="section-title">{{ stateCopy[2] }}</text>
    <view class="row-list">
      <template v-if="state === 'ALL'">
        <PersonalRow
          v-for="item in view.formal"
          :key="item.id"
          title="正式内容包"
          :detail="`${item.title} · ${item.canOpenContent ? '正常使用' : '当前不可学习'} · ${item.expires_at ? '至 ' + formatTime(item.expires_at) : '永久有效'}`"
          :badge="item.canOpenContent ? '有效' : '仅摘要'"
        />
        <PersonalRow
          v-for="item in view.limited"
          :key="item.id"
          title="限时活动"
          :detail="`${item.title} · ${item.state === 'PENDING' ? '待开始' : item.state === 'ENDED' ? '已结束' : '查看状态'} · ${formatTime(item.expiresAt || item.startsBefore)}`"
          :badge="
            item.state === 'PENDING'
              ? '待开始'
              : item.state === 'ENDED'
                ? '已结束'
                : item.state === 'EXCEPTION'
                  ? '暂不可用'
                  : '学习中'
          "
          actionable
          @press="openItem(item)"
        />
        <PersonalRow
          title="开放场景"
          :detail="
            catalog
              .filter((item) => item.access === 'OPEN')
              .map((item) => item.chinese_title || item.title)
              .join('、')
          "
          badge="永久开放"
        />
      </template>
      <template v-else-if="state === 'ENDED' || state === 'EXCEPTION'">
        <PersonalRow
          v-for="row in preserved"
          :key="row.route"
          :title="row.title"
          :detail="row.detail"
          :badge="row.badge"
          :size="state === 'ENDED' ? 'small' : 'normal'"
          actionable
          @press="open(row.route)"
        />
      </template>
      <template v-else
        ><PersonalRow
          v-for="item in limitedScenes"
          :key="item.scene_id"
          :title="item.chinese_title || item.title"
          :detail="
            state === 'PENDING'
              ? `${selected?.durationDays} 天活动场景之一`
              : item.progress
                ? `学习中 · 进度 ${item.progress}%`
                : '尚未开始'
          "
          :badge="state === 'PENDING' ? '待开始' : '可学习'"
          actionable
          @press="openScene(item)" /><PersonalRow
          v-if="state === 'ENDING'"
          title="学习历史"
          detail="查看本次学习进度和收藏"
          badge="可查看"
          actionable
          @press="open('/pages/favorites/history')"
      /></template>
    </view>
    <AppState
      v-if="state !== 'ALL' && !selected && !error"
      icon-label="状态"
      title="暂无该状态权益"
      description="请从权益列表进入当前有效记录"
    />
    <text v-if="error" class="form-error">{{ error }}</text
    ><AppButton v-if="error" label="重新加载" variant="secondary" @press="load" />
    <template #actions
      ><AppButton
        :label="stateCopy[3] || ''"
        :disabled="state !== 'ALL' && !selected"
        @press="action"
    /></template>
  </PersonalPage>
</template>
<style scoped lang="scss">
@use '../../profile/personal';

.result-grid {
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

.result-grid + .section-title {
  margin-top: 9px;
}

.result-grid ~ .row-list {
  gap: 7px;
}
</style>
