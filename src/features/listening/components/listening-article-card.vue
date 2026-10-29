<script setup lang="ts">
import {
  listeningDuration,
  listeningResumeText,
  listeningTimestamp
} from '@/features/listening/listening-presenter'
import { openListeningArticle } from '@/features/listening/listening-service'
import { useListeningThumbnail } from '@/features/listening/use-listening-thumbnail'

import type { ListeningArticleCardProps } from '@/shared/types/listening-components'
const props = defineProps<ListeningArticleCardProps>()
const { thumbnail, imageError, retryThumbnail } = useListeningThumbnail(
  () => props.article.thumbnail_url
)
</script>
<template>
  <view class="article-row"
    ><button class="article-main" @click="openListeningArticle(article)">
      <view class="thumbnail"
        ><image
          v-if="thumbnail && !imageError"
          class="thumbnail-image"
          :src="thumbnail"
          mode="aspectFit"
          @error="imageError = true"
        /><view
          v-else-if="imageError"
          class="thumbnail-retry"
          role="button"
          aria-label="重试配图"
          @click.stop="retryThumbnail"
          >配图加载失败<br />点击重试</view
        ><view v-else class="thumbnail-placeholder"
          ><image
            class="placeholder-icon"
            src="/static/listening/r17-thumbnail-placeholder.svg"
            mode="aspectFit"
          /><text>暂无配图</text></view
        ></view
      ><view class="article-info"
        ><text class="chinese">{{ article.title_zh }}</text
        ><text class="english">{{ article.title_en }}</text
        ><text class="meta"
          >{{ article.word_count }}词<text v-if="article.audio_duration_seconds">
            · {{ listeningDuration(article.audio_duration_seconds) }}</text
          ></text
        >
        <view class="article-state"
          ><text>{{
            !article.available
              ? '内容不可用'
              : !article.access.can_learn
                ? '需学习授权'
                : article.state.completed
                  ? '已学过 · 可以复习'
                  : article.progress?.updated_at
                    ? `学习中 · ${listeningResumeText(article)}`
                    : '未开始'
          }}</text
          ><text v-if="article.access.is_free" class="free-badge">免费</text
          ><text v-if="article.state.favorite" class="favorite-badge">已收藏</text></view
        ><text v-if="timestamp" class="meta">{{ listeningTimestamp(article, timestamp) }}</text
        ><slot /></view
      ><image
        class="article-arrow"
        src="/static/listening/r17-article-chevron.svg"
        mode="aspectFit"
      /></button
    ><slot name="action"
  /></view>
</template>
<style scoped lang="scss">
.article-row {
  padding: 24rpx 0;
  border-bottom: 1px solid #dfe5d8;

  .article-main {
    display: flex;
    gap: 26.923rpx;
    align-items: center;
    width: 100%;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    text-align: left;
  }

  .thumbnail {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 123rpx;
    height: 181rpx;
    border-radius: 12rpx;
    background: #edf1e5;
    color: #586c5b;
    font-size: 21rpx;

    .thumbnail-image {
      width: 100%;
      height: 100%;
    }
  }

  .thumbnail-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 11.538rpx;
  }

  .placeholder-icon {
    width: 23px;
    height: 23px;
  }

  .article-info {
    flex: 1;
    min-width: 0;
  }

  .chinese,
  .english,
  .meta {
    display: block;
  }

  .chinese {
    font-size: 30.769rpx;
    font-weight: 700;
    line-height: 1.6;
  }

  .english {
    margin: 7rpx 0;
    font-family: var(--app-serif-font, Georgia, serif);
    font-size: 34.615rpx;
    line-height: 1.4;
  }

  .article-arrow {
    flex: none;
    width: 16px;
    height: 16px;
  }

  .article-state {
    display: flex;
    gap: 12rpx;
    flex-wrap: wrap;
    margin-top: 12rpx;
    font-size: 21.154rpx;
    color: #41664d;
  }

  .free-badge,
  .favorite-badge {
    padding: 0 7rpx;
    border-radius: 5rpx;
    background: #e4f0db;
  }

  .meta {
    font-size: 21rpx;
    color: #586c5b;
    line-height: 1.8;
  }
}
</style>
