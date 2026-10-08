<script setup lang="ts">
import { onHide, onLoad, onPageScroll, onShow, onUnload } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

import AppButton from '@/components/app-button/app-button.vue'
import AppState from '@/components/app-state/app-state.vue'
import FavoriteList from '@/features/favorites/components/favorite-list.vue'
import PersonalPage from '@/features/profile/components/personal-page.vue'
import { getRuntimeServices } from '@/services/runtime'
import { navigate } from '@/shared/navigation/navigate'
import { useFavoriteStore } from '@/stores/favorites'

import type { FavoriteGroup } from '@/features/favorites/favorite-presenter'
import type { FavoriteType } from '@/shared/contracts/favorites'
const props = withDefaults(defineProps<{ initialTab?: FavoriteType }>(), {
  initialTab: 'VOCABULARY'
})
const favorites = useFavoriteStore()
const error = ref('')
let visible = false
let generation = 0
const title = computed(() => (favorites.activeTab === 'PHRASE' ? '语块银行' : '词汇银行'))
/** 恢复路由选择的银行，query 为入口携带的标签参数 */
const handleLoad = (query?: Record<string, string>) =>
  favorites.selectTab(query?.tab === 'phrases' ? 'PHRASE' : props.initialTab)
/** 刷新完整收藏并恢复当前银行滚动位置 */
const handleShow = async () => {
  const current = ++generation
  try {
    await favorites.load(getRuntimeServices().favorites, true)
    if (!visible || current !== generation) return
    error.value = ''
    uni.pageScrollTo({ scrollTop: favorites.tabState[favorites.activeTab].scrollTop, duration: 0 })
  } catch {
    if (visible && current === generation) error.value = '收藏加载失败，请重试'
  }
}
/** 切换银行并恢复独立滚动位置，type 为目标收藏类型 */
const selectTab = (type: FavoriteType) => {
  favorites.selectTab(type)
  uni.pageScrollTo({ scrollTop: favorites.tabState[type].scrollTop, duration: 0 })
}
/** 打开收藏详情，group 为包含所有来源的展示组 */
const openGroup = async (group: FavoriteGroup) => {
  const id = group.items[0]?.id
  if (id)
    await navigate({
      type: 'navigateTo',
      url: `/pages/favorites/detail?id=${encodeURIComponent(id)}`
    })
}
/** 编辑当前银行筛选，确认后保留另一银行的筛选与滚动位置 */
const editFilter = () => {
  const type = favorites.activeTab
  uni.showModal({
    title: type === 'PHRASE' ? '筛选语块' : '筛选词汇',
    editable: true,
    placeholderText: '留空显示全部收藏',
    content: favorites.tabState[type].filter,
    success: (result) => {
      if (result.confirm)
        favorites.updateTabState(type, { filter: result.content?.trim() || '', scrollTop: 0 })
    }
  })
}
/** 将全部可见收藏传入翻卡队列，不限制张数 */
const startReview = async () => {
  const ids = favorites.visibleGroups.flatMap((group) => group.items.map((item) => item.id))
  if (!ids.length) return
  const previous = favorites.tabState[favorites.activeTab].review
  const review =
    previous && previous.cardIds.join(',') === ids.join(',')
      ? previous
      : { cardIds: ids, index: 0, face: 'FRONT' as const }
  favorites.updateTabState(favorites.activeTab, { review })
  await navigate({
    type: 'navigateTo',
    url: `/pages/favorites/review-${review.face.toLocaleLowerCase()}?index=${review.index}&bank=${favorites.activeTab}`
  })
}
onLoad(handleLoad)
/** 显示银行时刷新收藏和当前阅读位置 */
onShow(async () => {
  visible = true
  await handleShow()
})
/** 隐藏或销毁银行后阻止旧请求操作当前新页面 */
const leave = () => {
  visible = false
  generation++
}
onHide(leave)
onUnload(leave)
onPageScroll((event) =>
  favorites.updateTabState(favorites.activeTab, { scrollTop: event.scrollTop })
)
</script>
<template>
  <PersonalPage
    active="favorites"
    :title="title"
    :subtitle="
      favorites.activeTab === 'PHRASE'
        ? '完整语块作为一条收藏保留'
        : '收藏的词汇会保留来源与复习进度'
    "
  >
    <view class="bank-tabs">
      <button
        :class="{ selected: favorites.activeTab === 'VOCABULARY' }"
        @click="selectTab('VOCABULARY')"
      >
        词汇银行
      </button>
      <button :class="{ selected: favorites.activeTab === 'PHRASE' }" @click="selectTab('PHRASE')">
        语块银行
      </button>
    </view>
    <view class="bank-heading"
      ><text class="section-title"
        >我的{{ favorites.activeTab === 'PHRASE' ? '语块' : '词汇' }}</text
      ><button class="filter-action" @click="editFilter">
        筛选{{ favorites.tabState[favorites.activeTab].filter ? '中' : '' }}
      </button></view
    >
    <FavoriteList :groups="favorites.visibleGroups" @select="openGroup" />
    <AppState
      v-if="!favorites.loading && !favorites.visibleGroups.length && !error"
      icon-label="状态"
      title="还没有收藏内容"
      description="在场景中收藏的词汇和语块会保存在这里"
    />
    <text v-if="error" class="form-error">{{ error }}</text>
    <AppButton v-if="error" label="重新加载" variant="secondary" @press="handleShow" />
    <template #actions
      ><AppButton v-if="favorites.visibleGroups.length" label="开始翻卡复习" @press="startReview"
    /></template>
  </PersonalPage>
</template>
<style scoped lang="scss">
@use '../../profile/personal';

.bank-heading {
  display: flex;
  align-items: center;
  gap: 8px;

  .section-title {
    flex: 1;
    margin-top: 0;
  }

  .filter-action {
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: #6b7d6a;
    font-size: 11px;
    line-height: 27px;

    &::after {
      border: 0;
    }
  }
}

.bank-tabs + .section-title {
  margin-top: 10px;
}

.bank-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  margin-top: 3px;
  margin-bottom: 15px;

  button {
    height: 40px;
    margin: 0;
    padding: 0 8px;
    border: 1px solid #d6dfc9;
    border-radius: 11px;
    background: #fffdf7;
    color: #4e7f3b;
    font-size: 13px;
    line-height: 38px;

    &.selected {
      border-color: #4e7f3b;
      background: #4e7f3b;
      color: #fff;
    }
  }
}
</style>
