<script setup lang="ts">
import { onPageScroll, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

import AppPage from '@/components/app-page/app-page.vue'
import AppState from '@/components/app-state/app-state.vue'
import { usePageShareEntry } from '@/composables/use-page-share-entry'
import SceneAudioPlayer from '@/features/learning/components/scene-audio-player.vue'
import SceneDictionary from '@/features/learning/components/scene-dictionary.vue'
import { listeningSourceSentence } from '@/features/listening/listening-presenter'
import { useListeningThumbnail } from '@/features/listening/use-listening-thumbnail'
import { openLogin } from '@/services/navigation'
import { pageShare } from '@/services/page-share'
import { LEARNING_FEATURES } from '@/shared/constants/learning-features'
import { Routes } from '@/shared/constants/navigation'
import { PageBackgroundKind } from '@/shared/enums/ui'
import ListeningBody from '@/sub-packages/listening/components/listening-body.vue'
import ListeningCompletion from '@/sub-packages/listening/components/listening-completion.vue'
import ListeningImageViewer from '@/sub-packages/listening/components/listening-image-viewer.vue'
import ListeningVocabulary from '@/sub-packages/listening/components/listening-vocabulary.vue'
import { validateTimeline } from '@/sub-packages/listening/reading-model'
import { useListeningArticle } from '@/sub-packages/listening/use-listening-article'

const pageShareEntry = usePageShareEntry()
const solidHeader = ref(false)
onPageScroll((event) => {
  solidHeader.value = event.scrollTop > 0
})
const {
  bodyRef,
  startUserScroll,
  toggleTranslation,
  leave,
  advance,
  retryAction,
  article,
  summary,
  busy,
  error,
  permissionError,
  translation,
  saveError,
  actionError,
  actionBusy,
  nextArticle,
  endedTopic,
  endedCategoryId,
  completed,
  completionResult,
  lookupRestricted,
  image,
  imageError,
  imageOpen,
  selection,
  dictionary,
  dictionaryBusy,
  dictionaryError,
  audio,
  follow,
  retryLoad,
  save,
  toggle,
  seek,
  setRate,
  favorite,
  complete,
  getNext,
  openImage,
  lookup,
  closeDictionary,
  pronounce,
  pronounceVocabulary
} = useListeningArticle(pageShareEntry)
const {
  thumbnail,
  imageError: thumbnailError,
  retryThumbnail
} = useListeningThumbnail(() => article.value?.thumbnail_url)
const sourceSentence = computed(() =>
  article.value && selection.value
    ? listeningSourceSentence(
        article.value.payload.body_en,
        selection.value.start,
        selection.value.end
      )
    : ''
)
const syncStatus = computed(() => {
  if (!LEARNING_FEATURES.listeningSync) return ''
  const value = article.value
  if (
    !value ||
    value.timeline.state !== 'ready' ||
    !validateTimeline(
      value.payload.body_en,
      value.timeline.words || [],
      audio.value.duration * 1000
    )
  )
    return '本篇暂不支持同步高亮 · 可正常听读'
  return audio.value.status === 'playing'
    ? follow.value
      ? '正在播放 · 逐字高亮跟随音频'
      : '正在播放 · 已暂停自动跟随'
    : audio.value.status === 'paused'
      ? '已暂停 · 高亮与尾迹保持当前位置'
      : ''
})
/** 分类结束后返回本篇所属分类 */
const topic = () => {
  if (summary.value)
    uni.redirectTo({
      url: `${Routes.LISTENING}?category_id=${encodeURIComponent(endedCategoryId.value || summary.value.category_id)}`
    })
}
/** 只关闭大图覆盖层，保留原阅读位置和播放状态 */
const closeImage = () => {
  imageOpen.value = false
}

onShareAppMessage(() => ({ ...pageShare.friends }))
onShareTimeline(() => ({ ...pageShare.timeline }))
</script>
<template>
  <AppPage
    :background-kind="PageBackgroundKind.READING"
    :solid-header="solidHeader"
    title="主题听读"
    back
    custom-back
    :fallback="Routes.LISTENING"
    @touchmove="startUserScroll"
    @wheel="startUserScroll"
    @keydown="startUserScroll"
    @back="leave"
    ><AppState
      :busy="busy && !article"
      :error="!summary ? error : ''"
      centered-error
      @retry="retryLoad"
    /><view v-if="!article && summary" class="locked"
      ><text class="article-title">{{ summary.title_zh }}</text
      ><text class="article-english">{{ summary.title_en }}</text
      ><view class="locked-meta"
        ><view class="article-tags"
          ><text v-for="tag in summary.tags" :key="tag" class="article-tag">{{ tag }}</text></view
        ><text class="article-counts">{{ summary.word_count }}词</text></view
      ><view
        v-if="
          LEARNING_FEATURES.authorization &&
          !summary.state &&
          summary.available &&
          !summary.access.can_learn
        "
        class="guest-locked"
      >
        <image src="/static/listening/r17-lock.svg" mode="aspectFit" aria-hidden="true" />
        <text class="guest-locked-title">此内容需学习授权</text>
        <text class="guest-locked-copy"
          >登录后可查看当前账号的学习授权状态。免费内容可继续体验。</text
        >
        <button
          class="primary"
          @click="openLogin(`${Routes.ARTICLE}?id=${encodeURIComponent(summary.id)}`)"
        >
          登录查看授权
        </button>
        <button class="secondary" @click="topic">返回继续浏览</button> </view
      ><AppState
        v-else-if="!summary.available || !summary.access.can_learn"
        empty
        prominent
        icon="/static/listening/r17-lock.svg"
        :icon-size="30"
        :title="
          summary.available
            ? LEARNING_FEATURES.authorization
              ? '此篇需学习授权'
              : '暂未开放'
            : '当前内容暂不可用'
        "
        :description="error || '请返回分类文章查看其他篇目'"
        :error="error"
        centered-error
        action-label="返回分类文章"
        @retry="retryLoad"
        @action="topic"
      /><AppState
        v-else
        :error="error"
        centered-error
        title="内容暂时未加载出来"
        @retry="retryLoad"
      /><button v-if="summary.state?.favorite" class="text-button" @click="favorite">
        取消收藏
      </button></view
    ><template v-if="article"
      ><text v-if="!article.state" class="guest-reading-note"
        >当前为游客体验，登录后可保存学习记录。</text
      ><view class="reading-actions"
        ><button
          :disabled="actionBusy"
          class="heading-favorite"
          :aria-label="article.state?.favorite ? '取消收藏本篇' : '收藏本篇'"
          :aria-pressed="article.state?.favorite"
          @click="favorite"
        >
          <image
            class="favorite-icon"
            :class="{ active: article.state?.favorite }"
            :src="
              article.state?.favorite
                ? '/static/listening/r17-favorite-filled.svg'
                : '/static/listening/r17-article-heart.svg'
            "
            mode="aspectFit"
          /><text>{{ article.state?.favorite ? '已收藏' : '收藏' }}</text>
        </button></view
      ><view class="article-heading"
        ><view class="titles"
          ><text class="article-title">{{ article.title_zh }}</text
          ><text class="article-english">{{ article.title_en }}</text> </view
        ><button v-if="article.payload.image_id" class="image-entry" @click="openImage">
          <image
            v-if="thumbnail && !thumbnailError"
            class="article-thumbnail"
            :src="thumbnail"
            mode="aspectFit"
            @error="thumbnailError = true"
          /><text v-if="thumbnailError" @click.stop="retryThumbnail">配图失败，点击重试</text
          ><view class="image-caption"
            ><image
              class="expand-icon"
              src="/static/listening/r17-image-expand.svg"
              mode="aspectFit"
            /><text>查看大图</text></view
          >
        </button></view
      ><view class="article-meta"
        ><view class="article-tags"
          ><text v-for="tag in article.tags" :key="tag" class="article-tag">{{ tag }}</text
          ><text v-if="article.access.is_free" class="article-tag">免费</text></view
        ><text class="article-counts"
          >{{ article.word_count }}词 · {{ article.payload.expressions?.length || 0 }}个表达</text
        ></view
      ><SceneAudioPlayer
        :state="audio"
        title="全文音频"
        :sync-status="syncStatus"
        @toggle="toggle"
        @seek="seek"
        @rate="setRate"
      /><AppState
        v-if="permissionError"
        :error="permissionError"
        @retry="retryLoad"
      /><ListeningBody
        ref="bodyRef"
        :article="article"
        :milliseconds="audio.position * 1000"
        :duration="audio.duration"
        :ended="audio.status === 'ended'"
        @lookup="lookup"
        @browse="follow = false"
      /><view
        v-if="LEARNING_FEATURES.dictionary && lookupRestricted"
        class="lookup-restriction"
        role="status"
        >点词查询需学习授权<button
          class="text-button restriction-close"
          aria-label="关闭授权提示"
          @click="lookupRestricted = false"
        >
          关闭
        </button></view
      ><button class="translation-toggle" :aria-expanded="translation" @click="toggleTranslation">
        {{ translation ? '收起全文译文' : '展开全文中文译文' }}
        <image
          class="translation-chevron"
          :class="{ expanded: translation }"
          src="/static/listening/r17-translate-chevron.svg"
          mode="aspectFit"
        /></button
      ><view v-if="translation" class="translation"
        ><view
          v-for="(paragraph, index) in article.payload.translation_zh.split(/\r\n|\r|\n/)"
          :key="index"
          class="paragraph"
          >{{ paragraph }}</view
        ></view
      ><ListeningVocabulary
        :words="article.payload.vocabulary || []"
        :body="article.payload.body_en"
        :audio="audio"
        @play="pronounceVocabulary"
      /><view class="expressions"
        ><text class="section-title">把表达带进你的生活</text
        ><view
          v-for="(expression, index) in article.payload.expressions"
          :key="index"
          class="expression"
          ><text class="expression-english">{{ expression.english }}</text
          ><text class="expression-chinese">{{ expression.chinese }}</text
          ><text class="example">{{ expression.example }}</text></view
        ></view
      ><view class="article-actions"
        ><button :disabled="actionBusy" class="primary" @click="complete">
          {{
            !article.state
              ? '完成本次学习'
              : completed || article.state.today_completed
                ? '已完成 · 再次复习'
                : '完成本篇学习'
          }}</button
        ><button v-if="nextArticle" class="next-action" :disabled="actionBusy" @click="advance">
          继续学习下一篇
        </button></view
      ><text class="completion-help">{{
        article.state ? '完成后计入听读记录，并更新当日打卡' : '登录后可保存学习记录和打卡'
      }}</text
      ><ListeningCompletion
        v-if="completed"
        :next="nextArticle"
        :ended="endedTopic"
        :result="completionResult"
        :busy="actionBusy"
        :error="actionError"
        @next="advance"
        @topic="topic"
        @stay="completed = false"
        @retry="getNext"
      />
      <AppState v-if="actionError" :error="actionError" @retry="retryAction" /><view
        v-if="saveError"
        class="notice error"
        >{{ saveError }}<button class="text-button" @click="save">重试同步进度</button></view
      ></template
    ><SceneDictionary
      v-if="selection"
      :source-sentence="sourceSentence"
      :selection="selection"
      :result="dictionary"
      :busy="dictionaryBusy"
      :error="dictionaryError"
      :voice-status="audio.wordStatus"
      :voice-error="audio.wordError"
      @close="closeDictionary"
      @retry="
        lookup({ text: selection.word, start: selection.start, end: selection.end, word: true })
      "
      @play="pronounce"
    /><ListeningImageViewer
      v-if="imageOpen"
      :image="image"
      :error="imageError"
      @close="closeImage"
      @retry="openImage"
      @error="imageError = '原图加载失败，请重试'"
    />
  </AppPage>
</template>
<style scoped lang="scss">
.guest-locked {
  margin-top: 53.846rpx;
  text-align: center;

  image {
    width: 57.692rpx;
    height: 57.692rpx;
    margin: 0 auto 34.615rpx;
  }

  .guest-locked-title,
  .guest-locked-copy {
    display: block;
  }

  .guest-locked-title {
    font-size: 38.462rpx;
    font-weight: 700;
    line-height: 57.692rpx;
  }

  .guest-locked-copy {
    margin: 23.077rpx 0 38.462rpx;
    color: #586c5b;
    font-size: 25rpx;
    line-height: 47.5rpx;
  }

  button {
    width: 100%;
    min-height: 84.615rpx;
    border-radius: 17.308rpx;
    font-size: 25rpx;
  }

  .secondary {
    margin-top: 23.077rpx;
    border: 1px solid #dfe5d8;
    background: #fffcf5;
  }
}

.article-heading {
  display: flex;
  gap: 22rpx;
  align-items: flex-start;

  .titles {
    flex: 1;
    min-width: 0;
  }
}

.article-title {
  display: block;
  font-size: 34.615rpx;
  line-height: 1.6;
  font-weight: 700;
}

.article-english {
  display: block;
  margin: 14rpx 0;
  font-family: var(--app-serif-font, Georgia, serif);
  font-size: 48.077rpx;
  line-height: 1.25;
}

.article-tags {
  display: flex;
  gap: 14rpx;
  flex-wrap: wrap;
  color: #586c5b;
  font-size: 22rpx;

  .article-tag {
    padding: 4rpx 10rpx;
    background: #edf2e5;
    border-radius: 7rpx;
  }
}

.image-entry {
  display: flex;
  flex: none;
  flex-direction: column;
  align-items: center;
  gap: 11.538rpx;
  width: 134.615rpx;
  padding: 0;
  background: transparent;
  border: 0;
  font-size: 21rpx;

  .article-thumbnail {
    width: 123rpx;
    height: 184.615rpx;
    border-radius: 12rpx;
  }
}

.image-caption {
  display: flex;
  align-items: center;
  gap: 5.769rpx;
  font-size: 19.231rpx;
  color: #41664d;
}

.expand-icon {
  width: 11px;
  height: 11px;
}

.translation-chevron {
  width: 16px;
  height: 16px;

  &.expanded {
    transform: rotate(180deg);
  }
}

.translation-toggle {
  display: flex;
  justify-content: space-between;
  width: 100%;
  padding: 24rpx 0;
  margin: 24rpx 0;
  background: transparent;
  border: 0;
  border-top: 1px solid #dfe5d8;
  border-bottom: 1px solid #dfe5d8;
  border-radius: 0;
  font-size: 25rpx;
}

.translation {
  padding: 28rpx;
  border-radius: 20rpx;
  background: #f0f3e9;
  font-size: 28rpx;
  line-height: 1.9;

  .paragraph {
    text-indent: 2em;
    margin-bottom: 24rpx;
    white-space: pre-wrap;
  }
}

.expressions {
  margin-top: 48rpx;

  .expression {
    margin: 28rpx 0;
    padding-bottom: 28rpx;
    border-bottom: 1px solid #dfe5d8;
  }

  .expression-chinese,
  .expression-english,
  .example,
  .section-title {
    display: block;
    font-size: 25rpx;
    line-height: 1.8;
  }

  .section-title {
    font-size: 32rpx;
  }

  .expression-english {
    font-weight: 500;
    font-family: var(--app-latin-font, sans-serif);
    font-size: 38.462rpx;
  }

  .example {
    font-size: 28.846rpx;
    margin-top: 12rpx;
    font-family: var(--app-latin-font, 'DM Sans', sans-serif);
    color: #586c5b;
  }
}

.article-actions {
  display: flex;
  flex-direction: column;
  gap: 17.308rpx;
  margin-top: 46.154rpx;

  .primary,
  .next-action {
    width: 100%;
    min-height: 44px;
    font-size: 25rpx;
  }
}

.locked-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  padding-bottom: 38rpx;
  margin-top: 20rpx;
  border-bottom: 1px solid #dfe5d8;
}

.reading-actions {
  display: flex;
  justify-content: flex-end;
  height: 38.462rpx;
  align-items: center;
  margin: -25rpx 0 25rpx;
}

.heading-favorite {
  display: flex;
  align-items: center;
  gap: 10rpx;
  font-size: 24rpx;
  justify-content: center;
  min-width: 44px;
  height: 44px;
  padding: 0;
  margin: 0 -12rpx 0 0;
  border: 0;
  background: transparent;
}

.favorite-icon {
  width: 20px;
  height: 20px;

  &.active {
    width: 23px;
    height: 23px;
  }
}

.article-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  margin-top: 22rpx;
}

.article-counts {
  flex: none;
  font-size: 21.154rpx;
  color: #586c5b;
}

.lookup-restriction {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 22rpx 26rpx;
  border-radius: 16rpx;
  background: #e4f0db;
  color: #41664d;
  font-size: 25rpx;
}

.restriction-close {
  min-height: 44px;
  margin: 0;
  font-size: 23rpx;
}

.completion-help {
  display: block;
  margin-top: 17rpx;
  color: #586c5b;
  text-align: center;
  font-size: 21.154rpx;
}
</style>
