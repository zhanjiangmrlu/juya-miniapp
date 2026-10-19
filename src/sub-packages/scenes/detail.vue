<script setup lang="ts">
import { onHide, onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { computed, ref, watch } from 'vue'

import AppPage from '@/components/app-page/app-page.vue'
import AppState from '@/components/app-state/app-state.vue'
import { createAudioController } from '@/features/learning/audio-controller'
import SceneAudioPlayer from '@/features/learning/components/scene-audio-player.vue'
import SceneDialogue from '@/features/learning/components/scene-dialogue.vue'
import SceneSectionHeading from '@/features/learning/components/scene-section-heading.vue'
import SceneUnavailable from '@/features/learning/components/scene-unavailable.vue'
import SceneVocabulary from '@/features/learning/components/scene-vocabulary.vue'
import { onSessionExpired, operations, session } from '@/services/api'
import { createAudioPort } from '@/services/audio-port'
import { ApiError } from '@/services/errors'
import { createFullAudioPreparation } from '@/services/full-audio-preparation'
import { registerImagePreview } from '@/services/image-preview'
import { mediaAddress } from '@/services/media-service'
import { operationKey, resourceURL } from '@/services/platform'
import { loadPronunciation } from '@/services/pronunciation-service'
import { prepareAudioCacheFile, prepareWordAudioFile } from '@/services/word-audio-file'
import { createWordAudioPreparation, waitForWordAudio } from '@/services/word-audio-preparation'
import { Routes } from '@/shared/constants/navigation'
import { AudioStatus } from '@/shared/enums/audio'
import { useAccountStore } from '@/stores/account-store'

import type { components } from '@/shared/contracts/generated/mini-api'
import type { AudioState } from '@/shared/types/audio'
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
  rate: 1,
  rateError: '',
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
  visible = true,
  generation = 0,
  audio: ReturnType<typeof createAudioController> | null = null,
  fullAudio: ReturnType<typeof createFullAudioPreparation> | null = null,
  wordAudio: ReturnType<typeof createWordAudioPreparation> | null = null,
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
  if (audio || !visible || !card.value || stale.value) return
  const current = card.value,
    owner = account.profile,
    userId = session.userId()
  const full = createAudioPort(),
    word = createAudioPort()
  const player = createAudioController(
    full,
    word,
    (state) => {
      if (alive) audioState.value = state
    },
    undefined,
    (wordId) => wordAudio?.invalidate(wordId),
    () => fullAudio?.invalidate()
  )
  audio = player
  /** 确认两个准备任务仍属于当前页面、会话和发布版本 */
  const active = () =>
    alive &&
    audio === player &&
    account.profile === owner &&
    session.userId() === userId &&
    card.value?.version_id === current.version_id &&
    !stale.value
  /** 仅处理服务端确认的失效，后台网络失败不打断正文
   * @param reason 地址请求或下载得到的访问错误
   */
  const onFailure = (reason: unknown) => {
    if (reason instanceof ApiError && reason.status === 401) {
      stopAudio()
      void account.restore().catch(() => undefined)
    } else void invalid(reason)
  }
  if (current.content.audio_id) {
    const audioId = current.content.audio_id
    fullAudio = createFullAudioPreparation({
      active,
      resolve: () => mediaAddress(id, audioId, current.version_id, false, true),
      download: prepareAudioCacheFile,
      prepared: player.prepareFull,
      onFailure
    })
  }
  wordAudio = createWordAudioPreparation({
    active,
    resolve: async (wordId, task) => {
      const path = `/api/mini/v1/cards/${encodeURIComponent(id)}/words/${encodeURIComponent(wordId)}/pronunciation`
      const url = await loadPronunciation(
        {
          active: task.active,
          pause: (milliseconds) => waitForWordAudio(milliseconds, task),
          request: (method, path, reference) =>
            session.request<components['schemas']['SpeechState']>(
              method === 'GET'
                ? `${path}?version_id=${encodeURIComponent(reference.version_id || '')}`
                : path,
              method === 'POST' ? { method, key: operationKey(), body: reference } : {}
            )
        },
        path,
        { version_id: current.version_id }
      )
      return resourceURL(url)
    },
    download: prepareWordAudioFile,
    onFailure
  })
  audio.state.duration = card.value.audio_duration || 0
  audioState.value = { ...audio.state }
  fullAudio?.prefetch()
  wordAudio.prefetch(
    (current.content.vocabulary || []).flatMap((word) => (word.id ? [word.id] : []))
  )
}
/** 离开场景时先停止播放器，再取消准备任务和释放临时音频 */
const stopAudio = () => {
  audio?.dispose()
  audio = null
  fullAudio?.dispose()
  fullAudio = null
  wordAudio?.dispose()
  wordAudio = null
}
const releaseAudioSession = onSessionExpired(stopAudio)
watch(() => account.profile, stopAudio)
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
    title_en: previous?.content.title_en || '',
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
/** 已准备好的完整音频同步播放，提前点击只等待受控地址 */
const playFull = () => {
  if (!card.value || stale.value) return
  createAudio()
  const prepared = fullAudio
  if (prepared) void audio?.toggleFull(() => prepared.load())
}
/** 已准备的词汇同步从本地播放，未完成时复用当前任务
 * @param wordId 当前发布版本中的词汇编号
 */
const playWord = (wordId: string) => {
  if (!card.value || stale.value) return
  createAudio()
  const prepared = wordAudio
  if (prepared) void audio?.playWord(wordId, () => prepared.load(wordId))
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
  visible = true
  if (card.value) {
    createAudio()
    void refreshState().catch(invalid)
  }
})
onHide(() => {
  if (!imageOpen) {
    visible = false
    stopAudio()
  }
})
onUnload(() => {
  alive = false
  visible = false
  generation++
  stopAudio()
  releaseAudioSession()
  releaseImage?.()
})
</script>
<template>
  <AppPage :title="summary ? '场景卡暂不可用' : '场景学习'" back footer
    ><AppState :busy="busy && !card" :error="error" @retry="load" /><template v-if="stale"
      ><view class="notice">内容已更新，请重新获取后继续学习</view
      ><button class="primary" @click="load">刷新内容</button></template
    ><SceneUnavailable
      v-else-if="summary"
      :summary="summary"
      :favorite-busy="favoriteBusy"
      :message="message"
      @unfavorite="toggleFavorite"
    /><template v-else-if="card"
      ><view class="scene-title between"
        ><text class="title">{{ card.content.name }}</text
        ><button
          class="favorite"
          :class="{ saved: favorite }"
          :disabled="favoriteBusy"
          :aria-pressed="favorite"
          @click="toggleFavorite"
        >
          <image
            class="favorite-icon"
            src="/static/design/heart.svg"
            mode="aspectFit"
            aria-hidden="true"
          /><text>{{ favoriteBusy ? '处理中' : favorite ? '已收藏' : '收藏整卡' }}</text>
        </button></view
      ><text v-if="card.content.title_en" class="scene-english">{{ card.content.title_en }}</text
      ><view class="scene-picture">
        <view class="scene-thumbnail" @click="previewImage">
          <image
            v-if="imageSrc && !imageError"
            :src="imageSrc"
            mode="aspectFit"
            :alt="card.content.name"
            @error="imageError = '图片暂未加载，可重试'"
          />
          <button v-else class="image-retry" @click.stop="loadImage">
            {{ imageError || '正在加载场景图…' }}
          </button>
        </view>
        <view class="scene-prompt">
          <text class="prompt-title">Start with the scene.</text>
          <text class="prompt-description">点开场景卡，查看完整图片。</text>
          <button class="expand-image" @click="previewImage">放大场景卡</button>
        </view>
      </view>
      <SceneAudioPlayer
        :state="audioState"
        @toggle="playFull"
        @seek="audio?.seekFull($event)"
        @rate="audio?.setRate($event)"
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
        ><SceneSectionHeading english="Useful expressions" chinese="实用语块" /><view
          v-for="chunk in card.content.chunks"
          :key="chunk.id"
          class="word"
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
  gap: 19.231rpx;
  margin-bottom: 23.077rpx;

  .title {
    flex: 1;
    min-width: 0;
    font-size: 34.615rpx;
    line-height: 1.6;
    font-weight: 500;
    overflow-wrap: anywhere;
  }

  .favorite {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 11.538rpx;
    border: 0;
    border-radius: 0;
    background: none;
    padding: 5.769rpx 0 5.769rpx 9.615rpx;
    min-height: 61.538rpx;
    color: #2b4438;
    font-size: 21.154rpx;

    .favorite-icon {
      width: 36.538rpx;
      height: 36.538rpx;
    }

    &.saved {
      color: #ad4f32;
    }
  }
}

.scene-english {
  display: block;
  font-family: Fraunces, Georgia, serif;
  font-size: 42.308rpx;
  line-height: 1.42;
  margin-bottom: 53.846rpx;
  overflow-wrap: anywhere;
}

.scene-picture {
  display: flex;
  align-items: center;
  gap: 34.615rpx;
  padding: 30.769rpx;
  border: 1px solid #dfe5d8;
  border-radius: 25rpx;
  background: #fff;

  .scene-thumbnail {
    width: 176.923rpx;
    height: 269.231rpx;
    flex-shrink: 0;
    overflow: hidden;
    border-radius: 7.692rpx;
  }

  image {
    display: block;
    width: 100%;
    height: 100%;
  }

  .image-retry {
    height: 100%;
    width: 100%;
    background: #f0f4e8;
    border: 0;
    color: #586c5b;
    font-size: 21.154rpx;
    padding: 11.538rpx;
    line-height: 1.8;
  }

  .scene-prompt {
    flex: 1;
    min-width: 0;
  }

  .prompt-title {
    display: block;
    font-family: Fraunces, Georgia, serif;
    font-size: 38.462rpx;
    line-height: 1.35;
    font-weight: 400;
    letter-spacing: -0.02em;
    margin-bottom: 17.308rpx;
  }

  .prompt-description {
    display: block;
    font-size: 21.154rpx;
    line-height: 1.8;
    margin-bottom: 19.231rpx;
    color: #586c5b;
  }

  .expand-image {
    display: inline-flex;
    border: 1px solid #dfe5d8;
    background: #fff;
    border-radius: 19.231rpx;
    padding: 17.308rpx 19.231rpx;
    font-size: 23.077rpx;
    line-height: 1.5;
    min-height: 76.923rpx;
  }
}

.chunks-section {
  margin-top: 57.692rpx;
}

.word {
  padding: 26.923rpx 0;
  border-bottom: 1px solid #dfe5d8;

  .word-english {
    display: block;
    font-size: 38.462rpx;
    font-weight: 500;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }

  .meaning {
    display: block;
    font-size: 30.769rpx;
    margin-top: 9.615rpx;
    overflow-wrap: anywhere;
    line-height: 1.8;
    color: #ad4f32;
  }
}

.success {
  margin-top: 46.154rpx;
}
</style>
