<script setup lang="ts">
import { onHide, onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

import AppPage from '@/components/app-page/app-page.vue'
import AppState from '@/components/app-state/app-state.vue'
import { createAudioController } from '@/features/learning/audio-controller'
import SceneAudioPlayer from '@/features/learning/components/scene-audio-player.vue'
import SceneDialogue from '@/features/learning/components/scene-dialogue.vue'
import SceneVocabulary from '@/features/learning/components/scene-vocabulary.vue'
import { operations, session } from '@/services/api'
import { ApiError } from '@/services/errors'
import { registerImagePreview } from '@/services/image-preview'
import { mediaAddress } from '@/services/media-service'
import { operationKey, resourceURL } from '@/services/platform'
import { loadPronunciation } from '@/services/pronunciation-service'
import { Routes } from '@/shared/constants/navigation'
import { AudioStatus } from '@/shared/enums/audio'
import { useAccountStore } from '@/stores/account-store'

import type { components } from '@/shared/contracts/generated/mini-api'
import type { AudioPort, AudioState } from '@/shared/types/audio'
import type { PublishedScene } from '@/shared/types/learning'
const account = useAccountStore(),
  card = ref<PublishedScene | null>(null),
  summary = ref<components['schemas']['PersonalSummary'] | null>(null),
  imageSrc = ref(''),
  imageError = ref(''),
  busy = ref(false),
  error = ref(''),
  actionError = ref(''),
  message = ref(''),
  completionStatistics = ref<components['schemas']['Statistics'] | null>(null),
  favoriteBusy = ref(false),
  completeBusy = ref(false),
  awaitingState = ref(false),
  stale = ref(false)
const audioState = ref<AudioState>({
  status: AudioStatus.IDLE,
  position: 0,
  duration: 0,
  error: '',
  wordId: null,
  wordStatus: AudioStatus.IDLE,
  wordError: ''
})
let id = '',
  alive = true,
  generation = 0,
  wordGeneration = 0,
  audio: ReturnType<typeof createAudioController> | null = null,
  imageOpen = false,
  releaseImage: (() => void) | null = null
const favorite = computed(
  () => card.value?.state.favorite || summary.value?.state.favorite || false
)
const completionLabel = computed(() =>
  card.value?.state.today_completed
    ? '今日已完成学习'
    : card.value?.state.completed
      ? '完成本次复习'
      : '已完成学习'
)
/** 进入当前场景时创建两路互斥音频，不自动播放 */
const createAudio = () => {
  if (audio || !card.value) return
  const full = uni.createInnerAudioContext(),
    word = uni.createInnerAudioContext()
  full.autoplay = false
  word.autoplay = false
  audio = createAudioController(full as AudioPort, word as AudioPort, (state) => {
    if (alive) audioState.value = state
  })
  audio.state.duration = card.value.audio_duration || 0
  audioState.value = { ...audio.state }
}
/** 离开场景时释放播放器 */
const stopAudio = () => {
  wordGeneration++
  audio?.dispose()
  audio = null
}
/** 真实下线、删除或版本变化后关闭可操作正文
 * @param reason 服务端已确认的访问错误
 */
const invalid = async (reason: unknown) => {
  if (!(reason instanceof ApiError)) return
  if (reason.status === 409) {
    stale.value = true
    stopAudio()
    actionError.value = '内容已更新，请刷新后继续'
    return
  }
  if (reason.status !== 410) return
  const previous = card.value
  card.value = null
  imageSrc.value = ''
  stopAudio()
  summary.value = {
    id,
    name: previous?.content.name || '这张场景卡',
    thumbnail_id: null,
    available: false,
    version_id: null,
    unavailable_reason: reason.code === 'card_deleted' ? 'deleted' : 'offline',
    state: previous?.state || { completed: false, today_completed: false, favorite: false }
  }
  try {
    const value = await session.request<components['schemas']['PersonalSummary']>(
      `/api/mini/v1/cards/${id}/summary`
    )
    if (alive) summary.value = value
  } catch {
    /* A learner without a previous favorite/completion only keeps the already-known safe label */
  }
}
/** 单独获取原图，失败不阻止正文学习 */
const loadImage = async () => {
  if (!card.value?.content.image_id) return
  imageError.value = ''
  try {
    const value = await mediaAddress(id, card.value.content.image_id, card.value.version_id)
    if (alive) imageSrc.value = value
  } catch (reason) {
    if (reason instanceof ApiError && [409, 410].includes(reason.status)) await invalid(reason)
    else imageError.value = '图片暂未加载，可重试'
  }
}
/** 读取当前不可变发布内容，草稿不会进入详情 */
const load = async () => {
  if (busy.value) return
  busy.value = true
  error.value = ''
  actionError.value = ''
  stale.value = false
  const run = ++generation
  try {
    if (!(await account.ensure(`${Routes.SCENE}?id=${encodeURIComponent(id)}`))) return
    const value = await session.request<PublishedScene>(`/api/mini/v1/cards/${id}`)
    if (!alive || run !== generation) return
    stopAudio()
    card.value = value
    summary.value = null
    awaitingState.value = false
    createAudio()
    void loadImage()
  } catch (reason) {
    if (!alive || run !== generation) return
    if (reason instanceof ApiError && reason.status === 410) await invalid(reason)
    else error.value = reason instanceof Error ? reason.message : '场景暂未获取'
  } finally {
    if (alive && run === generation) busy.value = false
  }
}
/** 请求操作后的当前日期状态，不把午夜前的重放结果当成今天完成 */
const refreshState = async () => {
  if (!card.value) return
  const version = card.value.version_id
  const value = await session.request<PublishedScene>(
    `/api/mini/v1/cards/${id}?version_id=${encodeURIComponent(version)}`
  )
  if (alive && card.value?.version_id === version) {
    card.value.state = value.state
    awaitingState.value = false
  }
}
/** 获取完整音频时继续使用当前同一发布版本 */
const playFull = async () => {
  wordGeneration++
  if (!card.value || stale.value) return
  createAudio()
  await audio?.toggleFull(async () => {
    try {
      return await mediaAddress(id, card.value!.content.audio_id!, card.value!.version_id)
    } catch (reason) {
      await invalid(reason)
      throw reason
    }
  })
}
/** 获取同一发布版本的受控词汇发音，切换或离页后停止旧查询
 * @param wordId 当前发布版本中的词汇编号
 */
const playWord = async (wordId: string) => {
  if (!card.value || stale.value) return
  createAudio()
  const player = audio,
    version = card.value.version_id,
    run = ++wordGeneration
  const active = () =>
    alive &&
    audio === player &&
    wordGeneration === run &&
    card.value?.version_id === version &&
    !stale.value
  await player?.playWord(wordId, async () => {
    try {
      const path = `/api/mini/v1/cards/${encodeURIComponent(id)}/words/${encodeURIComponent(wordId)}/pronunciation`
      const url = await loadPronunciation(
        {
          active,
          pause: () => new Promise((resolve) => setTimeout(resolve, 1000)),
          request: (method, path, reference) =>
            session.request<components['schemas']['SpeechState']>(
              method === 'GET'
                ? `${path}?version_id=${encodeURIComponent(reference.version_id || '')}`
                : path,
              method === 'POST' ? { method, key: operationKey(), body: reference } : {}
            )
        },
        path,
        { version_id: version }
      )
      return resourceURL(url)
    } catch (reason) {
      await invalid(reason)
      throw reason
    }
  })
}
/** 原图作为全屏覆盖页进入原生栈，系统返回只关闭覆盖层 */
const previewImage = () => {
  if (!card.value?.content.image_id || stale.value) return
  imageOpen = true
  releaseImage?.()
  releaseImage = registerImagePreview({
    cardId: id,
    versionId: card.value.version_id,
    imageId: card.value.content.image_id,
    title: card.value.content.name,
    onInvalid: (reason) => {
      void invalid(reason)
    },
    onClose: () => {
      imageOpen = false
    }
  })
  uni.navigateTo({
    url: `/sub-packages/scenes/image-preview?id=${encodeURIComponent(id)}`,
    fail: () => {
      imageOpen = false
      releaseImage?.()
    }
  })
}
/** 收藏或取消只改变整卡关联，未知响应保留原状态 */
const toggleFavorite = async () => {
  if (favoriteBusy.value || stale.value) return
  favoriteBusy.value = true
  actionError.value = ''
  try {
    if (favorite.value) {
      await operations.run(`favorite:${id}`, `/api/mini/v1/favorites/${id}`, 'DELETE')
      if (card.value) card.value.state.favorite = false
      if (summary.value) {
        summary.value.state.favorite = false
        message.value = '已取消收藏'
      }
    } else if (card.value) {
      await operations.run(`favorite:${id}`, `/api/mini/v1/cards/${id}/favorite`, 'PUT', {
        version_id: card.value.version_id
      })
      await refreshState()
    }
  } catch (reason) {
    await invalid(reason)
    actionError.value = reason instanceof Error ? reason.message : '收藏暂未成功，请重试'
  } finally {
    favoriteBusy.value = false
  }
}
/** 主动确认完成或复习，服务器成功后再读取可信统计 */
const complete = async () => {
  if (
    !card.value ||
    card.value.state.today_completed ||
    completeBusy.value ||
    awaitingState.value ||
    stale.value
  )
    return
  completeBusy.value = true
  actionError.value = ''
  message.value = ''
  completionStatistics.value = null
  try {
    await operations.run<components['schemas']['CompletionResponse']>(
      `complete:${id}`,
      `/api/mini/v1/cards/${id}/complete`,
      'POST',
      { version_id: card.value.version_id }
    )
    awaitingState.value = true
    message.value = '已计入学习记录'
    const results = await Promise.allSettled([refreshState(), account.refreshStatistics()])
    if (results[1].status === 'fulfilled') completionStatistics.value = account.statistics
    else message.value = '已计入学习记录，统计暂未更新'
    if (results[0].status === 'rejected') {
      await invalid(results[0].reason)
      actionError.value = '学习记录已保存，当前状态暂未更新，请刷新确认'
    }
  } catch (reason) {
    await invalid(reason)
    actionError.value = reason instanceof Error ? reason.message : '完成结果暂未确认，请查询或重试'
  } finally {
    completeBusy.value = false
  }
}
/** 查询本人待确认操作，成功后刷新当前状态，不能自行补记日期 */
const recover = async () => {
  actionError.value = ''
  try {
    for (const action of [`complete:${id}`, `favorite:${id}`]) {
      if (operations.pending(action)) await operations.recover(action)
    }
    if (card.value) await refreshState()
    await account.refreshStatistics()
  } catch (reason) {
    await invalid(reason)
    actionError.value = reason instanceof Error ? reason.message : '暂未确认结果，可重试原操作'
  }
}
onLoad((query) => {
  id = String(query?.id || '')
  if (!/^[A-Za-z0-9-]{1,64}$/.test(id)) {
    error.value = '未找到这张场景卡'
    return
  }
  void load()
})
onShow(() => {
  if (card.value) {
    createAudio()
    void refreshState().catch(invalid)
  }
})
onHide(() => {
  if (!imageOpen) stopAudio()
})
onUnload(() => {
  alive = false
  generation++
  stopAudio()
  releaseImage?.()
})
</script>
<template>
  <AppPage title="场景详情" back footer
    ><AppState :busy="busy && !card" :error="error" @retry="load" /><template v-if="stale"
      ><view class="notice">内容已更新，请重新获取后继续学习</view
      ><button class="primary" @click="load">刷新内容</button></template
    ><view v-else-if="summary" class="unavailable"
      ><text class="title">{{ summary.name }}</text
      ><text class="unavailable-description">{{
        summary.unavailable_reason === 'deleted'
          ? '这张卡片已删除，你的学习记录和打卡成绩会保留。'
          : '这张卡片暂不可用，你可以返回查看其他内容。'
      }}</text
      ><button v-if="summary.state.favorite" :disabled="favoriteBusy" @click="toggleFavorite">
        {{ favoriteBusy ? '处理中…' : '取消收藏' }}</button
      ><text v-else class="muted small">{{ message || '已有学习成绩会保留' }}</text></view
    ><template v-else-if="card"
      ><view class="scene-title between"
        ><text class="title">{{ card.content.name }}</text
        ><button class="favorite" :disabled="favoriteBusy" @click="toggleFavorite">
          <text class="star">{{ favorite ? '★' : '☆' }}</text
          ><text>{{ favoriteBusy ? '处理中' : favorite ? '已收藏' : '收藏' }}</text>
        </button></view
      ><view class="scene-picture" @click="previewImage"
        ><image
          v-if="imageSrc && !imageError"
          :src="imageSrc"
          mode="widthFix"
          :alt="card.content.name"
          @error="imageError = '图片暂未加载，可重试'"
        /><button v-else class="image-retry" @click.stop="loadImage">
          {{ imageError || '正在加载场景图…' }}
        </button></view
      ><SceneAudioPlayer
        :state="audioState"
        @toggle="playFull"
        @seek="audio?.seekFull($event)"
      /><SceneDialogue
        :key="card.version_id"
        :dialogue="card.content.dialogue || []"
        :vocabulary="card.content.vocabulary || []"
      />
      <SceneVocabulary
        :vocabulary="card.content.vocabulary || []"
        :dialogue="card.content.dialogue || []"
        :state="audioState"
        :disabled="stale"
        @play="playWord"
      />
      <view v-if="card.content.chunks?.length" class="chunks-section"
        ><text class="section-title">语块</text
        ><view v-for="chunk in card.content.chunks" :key="chunk.id" class="word"
          ><text class="word-english">{{ chunk.english }}</text
          ><text class="meaning">{{ chunk.chinese }}</text></view
        ></view
      ><view v-if="message" class="notice success"
        >{{ message
        }}<text v-if="completionStatistics">
          · 已学 {{ completionStatistics.completed_cards }} 张，连续
          {{ completionStatistics.current_streak }} 天</text
        ></view
      ></template
    ><view v-if="actionError" class="notice error"
      >{{ actionError }}<button class="text-button" @click="recover">查询并刷新状态</button></view
    ><template #footer
      ><view v-if="card && !stale" class="safe-footer"
        ><button
          class="primary"
          :disabled="completeBusy || card.state.today_completed || awaitingState"
          :loading="completeBusy"
          @click="complete"
        >
          {{ awaitingState ? '已记录，待刷新确认' : completionLabel }}
        </button></view
      ></template
    ></AppPage
  >
</template>
<style scoped lang="scss">
.scene-title {
  align-items: flex-start;

  .title {
    flex: 1;
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .favorite {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 2rpx;
    border: 0;
    background: none;
    padding: 4rpx 8rpx;
    color: #347553;
    font-size: 20rpx;

    .star {
      font-size: 42rpx;
      line-height: 1.2;
    }
  }
}

.scene-picture {
  margin-top: 36rpx;
  border-radius: 16rpx;
  overflow: hidden;
  background: #eef3e9;

  image {
    display: block;
    width: 100%;
  }

  .image-retry {
    min-height: 260rpx;
    width: 100%;
    background: none;
    border: 0;
    color: #637268;
    font-size: 24rpx;
  }
}

.chunks-section {
  margin-top: 52rpx;
}

.section-note {
  font-size: 22rpx;
  color: #637268;
  font-weight: 400;
}

.word {
  padding: 26rpx 0;
  border-bottom: 1px solid #e5e9de;

  .word-english {
    display: block;
    font-size: 34rpx;
    font-weight: 600;
    line-height: 1.6;
  }

  .phonetic {
    display: block;
    color: #637268;
    font-size: 24rpx;
    margin-top: 4rpx;
  }

  .meaning {
    display: block;
    font-size: 28rpx;
    margin-top: 10rpx;
    line-height: 1.8;
  }
}

.success {
  margin-top: 40rpx;
}

.unavailable {
  text-align: center;
  padding: 90rpx 12rpx;

  .title {
    font-size: 38rpx;
  }

  .unavailable-description {
    display: block;
    color: #637268;
    margin: 28rpx 0 40rpx;
    font-size: 28rpx;
    line-height: 1.9;
  }

  button {
    margin-bottom: 24rpx;
  }
}
</style>
