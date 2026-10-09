<script setup lang="ts">
import { onLoad, onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

import AppButton from '@/components/app-button/app-button.vue'
import AppState from '@/components/app-state/app-state.vue'
import { presentEntitlements } from '@/features/entitlements/entitlement-presenter'
import PersonalPage from '@/features/profile/components/personal-page.vue'
import PersonalRow from '@/features/profile/components/personal-row.vue'
import PersonalSummary from '@/features/profile/components/personal-summary.vue'
import { getRuntimeServices } from '@/services/runtime'
import {
  CONTENT_ACCESS_LEVELS,
  ENTITLEMENT_DEADLINE_COPY,
  ENTITLEMENT_EXCEPTION_LABELS,
  ENTITLEMENT_NAVIGATION_LABELS,
  LIMITED_ENTITLEMENT_CONTENT_STATES,
  LIMITED_ENTITLEMENT_RESULT_STATES,
  LIMITED_ENTITLEMENT_ROW_COPY
} from '@/shared/constants/entitlements'
import {
  AccessLevel,
  EntitlementPageState,
  LimitedEntitlementState
} from '@/shared/enums/entitlements'
import { NavigationType } from '@/shared/enums/navigation'
import { ProfileRowSize } from '@/shared/enums/profile'
import { ButtonVariant } from '@/shared/enums/ui'
import { navigate } from '@/shared/navigation/navigate'
import { createServerClock } from '@/shared/utils/server-clock'

import type { SceneSummary } from '@/shared/contracts/learning'
import type {
  EntitlementsViewModel,
  LimitedEntitlementViewModel
} from '@/shared/types/entitlements'
import type { EntitlementPageViewProps } from '@/shared/types/entitlements-components'
const props = withDefaults(defineProps<EntitlementPageViewProps>(), {
  state: EntitlementPageState.ALL,
  title: '我的学习权益'
})
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
/** 授权待确认优先于异常原因，未知服务端状态保持中性提示 */
const exceptionLabel = computed(() => {
  if (view.value.authorizationPending) return '待确认'
  const status = selected.value?.status
  if (status && Object.prototype.hasOwnProperty.call(ENTITLEMENT_EXCEPTION_LABELS, status))
    return ENTITLEMENT_EXCEPTION_LABELS[status as keyof typeof ENTITLEMENT_EXCEPTION_LABELS]!
  return '暂不可用'
})
/** 页面导航标题随权益展示状态更新 */
const navigationLabel = computed(() => ENTITLEMENT_NAVIGATION_LABELS[props.state])
/** 场景行说明，item 为当前权益覆盖的场景摘要 */
const getSceneDetail = (item: SceneSummary) => {
  if (props.state === LimitedEntitlementState.PENDING)
    return `${selected.value?.durationDays} 天活动场景之一`
  if (item.progress) return `学习中 · 进度 ${item.progress}%`
  return '尚未开始'
}
const stateCopy = computed(
  () =>
    ({
      [EntitlementPageState.ALL]: [
        '我的学习权益',
        '不同权益分别展示状态与期限',
        '权益分区',
        '前往场景学习'
      ],
      [LimitedEntitlementState.PENDING]: [
        '限时学习待开始',
        `${selected.value?.durationDays || ''} 天活动 · 首次打开场景后开始计时`,
        '本次开放场景',
        '开始学习'
      ],
      [LimitedEntitlementState.ACTIVE]: [
        '限时学习中',
        `${selected.value?.durationDays || ''} 天活动 · 场景已全部开放`,
        '继续学习',
        '继续学习'
      ],
      [LimitedEntitlementState.ENDING]: [
        '即将结束',
        `${selected.value?.durationDays || ''} 天限时学习 · 即将结束`,
        '最后的学习时间',
        '继续学习'
      ],
      [LimitedEntitlementState.ENDED]: [
        '限时学习已结束',
        '成果与收藏仍可查看',
        '查看保留内容',
        '查看学习记录'
      ],
      [LimitedEntitlementState.EXCEPTION]: [
        '限时权益状态',
        '当前不可进入完整活动内容',
        '你仍可以查看',
        '查看学习历史'
      ]
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
/** 汇总当前状态的期限、成果或异常原因 */
const summary = computed(() => {
  if (props.state === EntitlementPageState.ALL)
    return {
      label: '开放场景',
      value: `${catalog.value.filter((item) => item.access === AccessLevel.OPEN).length} 个`,
      note: '当前均可学习'
    }
  if (props.state === LimitedEntitlementState.ENDED)
    return {
      label: '本次成果',
      value: `${result.value?.learning_days ?? '—'} 天`,
      note: '实际学习天数'
    }
  if (props.state === LimitedEntitlementState.EXCEPTION)
    return {
      label: '当前状态',
      value: exceptionLabel.value,
      note: '收藏、进度和历史成果继续保留'
    }
  const copy = ENTITLEMENT_DEADLINE_COPY[props.state]
  return {
    label: copy?.label ?? '结束时间',
    value: formatTime(
      props.state === LimitedEntitlementState.PENDING
        ? selected.value?.startsBefore
        : selected.value?.expiresAt
    ),
    note: copy?.note ?? '收藏和学习进度会继续保留。'
  }
})
const limitedScenes = computed(() =>
  catalog.value.filter((item) => selected.value?.sceneIds.includes(item.scene_id))
)
/** 异常权益保留只读入口，结束权益补充实际收藏数量 */
const preserved = computed(() => {
  if (props.state === LimitedEntitlementState.EXCEPTION)
    return [
      {
        title: '学习历史',
        route: '/sub-packages/favorites/history',
        detail: '查看完成场景和历史进度',
        badge: '仅摘要'
      },
      {
        title: '词汇银行',
        route: '/sub-packages/favorites/index',
        detail: '已收藏词汇继续保留',
        badge: '可查看'
      },
      {
        title: '语块银行',
        route: '/sub-packages/favorites/phrases',
        detail: '已收藏语块继续保留',
        badge: '可查看'
      }
    ]
  return [
    {
      title: '收藏词汇',
      route: '/sub-packages/favorites/index',
      detail:
        props.state === LimitedEntitlementState.ENDED && result.value
          ? `${result.value.favorite_vocabulary} 条 · 进入词汇银行`
          : '已收藏词汇继续保留',
      badge: '›'
    },
    {
      title: '收藏语块',
      route: '/sub-packages/favorites/phrases',
      detail:
        props.state === LimitedEntitlementState.ENDED && result.value
          ? `${result.value.favorite_phrases} 条 · 进入语块银行`
          : '已收藏语块继续保留',
      badge: '›'
    },
    {
      title: '学习过的场景',
      route: '/sub-packages/favorites/history',
      detail: '查看完成场景和历史进度',
      badge: '›'
    }
  ]
})
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
    if (
      props.state !== EntitlementPageState.ALL &&
      selected.value &&
      selected.value.state !== props.state
    ) {
      await navigate({
        type: NavigationType.REDIRECT_TO,
        url: `/sub-packages/entitlement/${selected.value.state.toLocaleLowerCase()}?id=${encodeURIComponent(selected.value.id)}`
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
    type: NavigationType.NAVIGATE_TO,
    url: `/sub-packages/entitlement/${item.state.toLocaleLowerCase()}?id=${encodeURIComponent(item.id)}`
  })
/** 打开站内明细，url 为收藏或历史地址 */
const open = (url: string) => navigate({ type: NavigationType.NAVIGATE_TO, url })
/** 从状态页前往目录或只读历史，不在此页激活限时权益 */
const action = () => {
  if (props.state === LimitedEntitlementState.PENDING && limitedScenes.value[0])
    return openScene(limitedScenes.value[0])
  if (LIMITED_ENTITLEMENT_RESULT_STATES.includes(props.state))
    return open('/sub-packages/favorites/history')
  return navigate({ type: NavigationType.RE_LAUNCH, url: '/sub-packages/learning/index' })
}
/** 打开服务器目录仍可学习的场景，item 为当前场景摘要 */
const openScene = (item: SceneSummary) => {
  if (
    !view.value.authorizationPending &&
    LIMITED_ENTITLEMENT_CONTENT_STATES.includes(props.state) &&
    selected.value?.sceneIds.includes(item.scene_id) &&
    (props.state === LimitedEntitlementState.PENDING || CONTENT_ACCESS_LEVELS.includes(item.access))
  )
    void open(`/sub-packages/scene/detail?sceneId=${encodeURIComponent(item.scene_id)}`)
}
onLoad((query) => {
  selectedId.value = query?.id || ''
})
onShow(load)
</script>
<template>
  <PersonalPage
    :title="stateCopy[0] || title"
    :navigation="navigationLabel"
    :subtitle="stateCopy[1] || ''"
  >
    <PersonalSummary
      v-bind="summary"
      :compact="LIMITED_ENTITLEMENT_CONTENT_STATES.includes(state)"
    />
    <view v-if="state === LimitedEntitlementState.ENDED" class="result-grid"
      ><view class="result-card"
        ><text class="result-value">{{ result?.completed_scenes ?? '—' }}</text
        ><text class="result-label">完成场景</text></view
      ><view class="result-card"
        ><text class="result-value">{{ result?.learning_days ?? '—' }}</text
        ><text class="result-label">实际学习天数</text></view
      ><view class="result-card"
        ><text class="result-value">{{
          result ? result.favorite_vocabulary + result.favorite_phrases : '—'
        }}</text
        ><text class="result-label">收藏内容</text></view
      ></view
    >
    <text class="section-title">{{ stateCopy[2] }}</text>
    <view class="row-list">
      <template v-if="state === EntitlementPageState.ALL">
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
          :detail="`${item.title} · ${LIMITED_ENTITLEMENT_ROW_COPY[item.state].detail} · ${formatTime(item.expiresAt || item.startsBefore)}`"
          :badge="LIMITED_ENTITLEMENT_ROW_COPY[item.state].badge"
          actionable
          @press="openItem(item)"
        />
        <PersonalRow
          title="开放场景"
          :detail="
            catalog
              .filter((item) => item.access === AccessLevel.OPEN)
              .map((item) => item.chinese_title || item.title)
              .join('、')
          "
          badge="永久开放"
        />
      </template>
      <template
        v-else-if="
          state === LimitedEntitlementState.ENDED || state === LimitedEntitlementState.EXCEPTION
        "
      >
        <PersonalRow
          v-for="row in preserved"
          :key="row.route"
          :title="row.title"
          :detail="row.detail"
          :badge="row.badge"
          :size="
            state === LimitedEntitlementState.ENDED ? ProfileRowSize.SMALL : ProfileRowSize.NORMAL
          "
          actionable
          @press="open(row.route)"
        />
      </template>
      <template v-else
        ><PersonalRow
          v-for="item in limitedScenes"
          :key="item.scene_id"
          :title="item.chinese_title || item.title"
          :detail="getSceneDetail(item)"
          :badge="state === LimitedEntitlementState.PENDING ? '待开始' : '可学习'"
          actionable
          @press="openScene(item)" /><PersonalRow
          v-if="state === LimitedEntitlementState.ENDING"
          title="学习历史"
          detail="查看本次学习进度和收藏"
          badge="可查看"
          actionable
          @press="open('/sub-packages/favorites/history')"
      /></template>
    </view>
    <AppState
      v-if="state !== EntitlementPageState.ALL && !selected && !error"
      icon-label="状态"
      title="暂无该状态权益"
      description="请从权益列表进入当前有效记录"
    />
    <text v-if="error" class="form-error">{{ error }}</text
    ><AppButton v-if="error" label="重新加载" :variant="ButtonVariant.SECONDARY" @press="load" />
    <template #actions
      ><AppButton
        :label="stateCopy[3] || ''"
        :disabled="state !== EntitlementPageState.ALL && !selected"
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

  .result-card {
    display: flex;
    min-height: 84px;
    flex-direction: column;
    align-items: center;
    padding: 8px 4px;
    border: 1px solid #d6dfc9;
    border-radius: 12px;
    background: #fffdf7;

    .result-value {
      color: #4e7f3b;
      font-size: 26px;
      font-weight: 700;
      line-height: 39px;
    }

    .result-label {
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
