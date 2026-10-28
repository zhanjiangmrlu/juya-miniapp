<script setup lang="ts">
import AppPage from '@/components/app-page/app-page.vue'
import AppState from '@/components/app-state/app-state.vue'
import SceneAudioPlayer from '@/features/learning/components/scene-audio-player.vue'
import SceneDictionary from '@/features/learning/components/scene-dictionary.vue'
import ListeningBody from '@/features/listening/components/listening-body.vue'
import { useListeningArticle } from '@/features/listening/use-listening-article'
import { useListeningThumbnail } from '@/features/listening/use-listening-thumbnail'
import { Routes } from '@/shared/constants/navigation'
const {
  bodyRef,
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
  completed,
  image,
  imageError,
  imageOpen,
  selection,
  dictionary,
  dictionaryBusy,
  dictionaryError,
  audio,
  follow,
  load,
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
  pronounce
} = useListeningArticle()
const {
  thumbnail,
  imageError: thumbnailError,
  retryThumbnail
} = useListeningThumbnail(() => article.value?.thumbnail_url)
/** 主题结束后返回本篇所属主题，无跨主题连播 */
const topic = () => {
  if (summary.value) uni.redirectTo({ url: `${Routes.TOPIC}?id=${summary.value.topic_id}` })
}
/** 只关闭大图覆盖层，保留原阅读位置和播放状态 */
const closeImage = () => {
  imageOpen.value = false
}
</script>
<template>
  <AppPage title="主题听读" back custom-back :fallback="Routes.LISTENING" @back="leave"
    ><AppState :busy="busy && !article" :error="error" @retry="load" /><view
      v-if="!article && summary"
      class="locked"
      ><text class="article-title">{{ summary.title_zh }}</text
      ><text class="article-english">{{ summary.title_en }}</text
      ><text>当前内容暂不可学习，请返回查看其他篇目</text
      ><button v-if="summary.state.favorite" class="text-button" @click="favorite">
        取消收藏
      </button></view
    ><template v-if="article"
      ><view class="article-heading"
        ><view class="titles"
          ><text class="article-title">{{ article.title_zh }}</text
          ><text class="article-english">{{ article.title_en }}</text
          ><view class="article-tags"
            ><text v-for="tag in article.tags" :key="tag">{{ tag }}</text
            ><text>{{ article.word_count }} 词</text
            ><text v-if="article.access.is_free">免费</text></view
          ></view
        ><button v-if="article.payload.image_id" class="image-entry" @click="openImage">
          <image
            v-if="thumbnail && !thumbnailError"
            :src="thumbnail"
            mode="aspectFit"
            @error="thumbnailError = true"
          /><text v-if="thumbnailError" @click.stop="retryThumbnail">配图失败，点击重试</text
          ><text>查看大图</text>
        </button></view
      ><SceneAudioPlayer
        :state="audio"
        title="完整英文音频"
        english="LISTEN TO THE FULL ARTICLE"
        @toggle="toggle"
        @seek="seek"
        @rate="setRate"
      /><AppState v-if="permissionError" :error="permissionError" @retry="load" /><ListeningBody
        ref="bodyRef"
        :article="article"
        :milliseconds="audio.position * 1000"
        :duration="audio.duration"
        :ended="audio.status === 'ended'"
        @lookup="lookup"
        @browse="follow = false"
      /><button
        class="translation-toggle"
        :aria-expanded="translation"
        @click="translation = !translation"
      >
        {{ translation ? '收起全文译文' : '展开全文中文译文' }}
        {{ translation ? '⌃' : '⌄' }}</button
      ><view v-if="translation" class="translation"
        ><view
          v-for="(paragraph, index) in article.payload.translation_zh.split(/\r\n|\r|\n/)"
          :key="index"
          class="paragraph"
          >{{ paragraph }}</view
        ></view
      ><view class="expressions"
        ><text class="section-title">5个表达，带进生活</text
        ><view
          v-for="(expression, index) in article.payload.expressions"
          :key="index"
          class="expression"
          ><text class="expression-english">{{ index + 1 }}. {{ expression.english }}</text
          ><text>{{ expression.chinese }}</text
          ><text class="example">{{ expression.example }}</text></view
        ></view
      ><view class="article-actions"
        ><button :disabled="actionBusy" class="favorite" @click="favorite">
          {{ article.state.favorite ? '已收藏 · 取消' : '收藏本篇' }}</button
        ><button :disabled="actionBusy" class="primary" @click="complete">
          {{ completed || article.state.today_completed ? '已完成 · 再次复习' : '已完成学习' }}
        </button></view
      ><view v-if="completed" class="complete-result"
        ><text>本篇已完成，学习记录已保存</text
        ><button v-if="nextArticle" class="primary" :disabled="actionBusy" @click="advance">
          下一篇 · {{ nextArticle.title_zh }}</button
        ><template v-else-if="endedTopic"
          ><text>本主题已学到最后一篇</text><button @click="topic">返回主题列表</button
          ><button class="text-button" @click="completed = false">留在当前文章</button></template
        ><button v-else class="text-button" @click="getNext">获取下一篇</button></view
      ><AppState v-if="actionError" :error="actionError" @retry="retryAction" /><view
        v-if="saveError"
        class="notice error"
        >{{ saveError }}<button class="text-button" @click="save">重试同步进度</button></view
      ></template
    ><SceneDictionary
      v-if="selection"
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
    /><view v-if="imageOpen" class="image-veil"
      ><button class="image-close" aria-label="关闭大图" @click="closeImage">关闭</button
      ><AppState v-if="imageError" :error="imageError" @retry="openImage" /><movable-area
        v-else
        class="image-area"
        ><movable-view
          class="image-pan"
          direction="all"
          scale
          scale-area
          :scale-min="1"
          :scale-max="5"
          ><image
            :src="image"
            mode="aspectFit"
            class="original-image"
            @error="imageError = '原图加载失败，请重试'" /></movable-view></movable-area
      ><text class="image-help">双指缩放 · 放大后拖动</text></view
    ></AppPage
  >
</template>
<style scoped lang="scss">
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
  font-size: 42rpx;
  line-height: 1.5;
  font-weight: 600;
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

  text {
    padding: 4rpx 10rpx;
    background: #edf2e5;
    border-radius: 7rpx;
  }
}

.image-entry {
  width: 123rpx;
  padding: 0;
  background: transparent;
  border: 0;
  font-size: 21rpx;

  image {
    width: 123rpx;
    height: 181rpx;
    border-radius: 12rpx;
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

  text {
    display: block;
    font-size: 25rpx;
    line-height: 1.8;
  }

  .section-title {
    font-size: 32rpx;
  }

  .expression-english {
    font-weight: 600;
    font-size: 29rpx;
  }

  .example {
    margin-top: 12rpx;
    font-family: var(--app-latin-font, 'DM Sans', sans-serif);
    color: #586c5b;
  }
}

.article-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 40rpx;

  button {
    flex: 1;
    font-size: 25rpx;
  }
}

.complete-result {
  margin-top: 28rpx;
  padding: 28rpx;
  background: #edf2e5;
  border-radius: 20rpx;

  text {
    display: block;
    margin-bottom: 20rpx;
  }

  button {
    margin-top: 16rpx;
    font-size: 24rpx;
  }
}

.image-veil {
  position: fixed;
  z-index: 70;
  inset: 0;
  background: #20362b;
  color: #fff;

  .image-close {
    position: absolute;
    z-index: 2;
    right: 30rpx;
    top: 90rpx;
    background: #fffd;
    font-size: 26rpx;
  }

  .image-area {
    width: 100vw;
    height: 100vh;
  }

  .image-pan {
    width: 100%;
    height: 100%;
  }

  .original-image {
    width: 100%;
    height: 100%;
  }

  .image-help {
    position: absolute;
    bottom: 70rpx;
    left: 0;
    width: 100%;
    text-align: center;
    font-size: 25rpx;
  }
}
</style>
