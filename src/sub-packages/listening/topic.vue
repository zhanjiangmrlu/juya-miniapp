<script setup lang="ts">
import { onLoad, onShareAppMessage, onShareTimeline, onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'

import AppPage from '@/components/app-page/app-page.vue'
import AppState from '@/components/app-state/app-state.vue'
import { usePageShareEntry } from '@/composables/use-page-share-entry'
import { session } from '@/services/api'
import { pageShare } from '@/services/page-share'
import { LISTENING_API } from '@/shared/constants/listening'
import { Routes } from '@/shared/constants/navigation'
import { useAccountStore } from '@/stores/account-store'

import type { ListeningTopic } from '@/shared/types/listening'

const pageShareEntry = usePageShareEntry()
const id = ref(''),
  busy = ref(false),
  error = ref(''),
  account = useAccountStore()
/** 旧主题链接仅向服务端读取所属分类，不继续展示主题层级 */
const redirect = async () => {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    await account.restore()
    const result = await session.contentRequest<{ items: ListeningTopic[] }>(
      `${LISTENING_API}/topics`
    )
    const categoryId = result.items.find((item) => item.id === id.value)?.category_id
    if (!categoryId) throw new Error('原分类暂不可用，请返回全部文章')
    uni.redirectTo({ url: `${Routes.LISTENING}?category_id=${encodeURIComponent(categoryId)}` })
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '分类暂未获取，请重试'
  } finally {
    busy.value = false
  }
}
/** 无有效历史映射时明确返回全部文章 */
const all = () => uni.redirectTo({ url: Routes.LISTENING })
onLoad((query) => {
  if (pageShareEntry.value) return
  id.value = query?.id || ''
})
onShow(() => {
  if (!pageShareEntry.value) void redirect()
})

onShareAppMessage(() => ({ ...pageShare.friends }))
onShareTimeline(() => ({ ...pageShare.timeline }))
</script>
<template>
  <AppPage title="主题听读" back
    ><AppState :busy="busy" :error="error" centered-error @retry="redirect" /><button
      v-if="error"
      class="text-button"
      @click="all"
    >
      查看全部文章
    </button></AppPage
  >
</template>
