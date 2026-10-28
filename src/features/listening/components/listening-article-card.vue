<script setup lang="ts">
import { listeningTimestamp } from '@/features/listening/listening-presenter'
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
        ><text v-else>暂无配图</text></view
      ><view class="article-info"
        ><text class="chinese">{{ article.title_zh }}</text
        ><text class="english">{{ article.title_en }}</text
        ><text class="meta"
          >{{ article.word_count }} 词 ·
          {{
            !article.available
              ? '内容不可用'
              : article.access.can_learn
                ? article.access.is_free
                  ? '免费'
                  : '可学习'
                : '需学习授权'
          }}</text
        ><text class="meta"
          >{{ article.state.completed ? '已学过 · 可复习' : '' }}
          {{ article.state.favorite ? '已收藏' : '' }}</text
        ><text v-if="timestamp" class="meta">{{ listeningTimestamp(article, timestamp) }}</text
        ><slot
      /></view></button
    ><slot name="action"
  /></view>
</template>
<style scoped lang="scss">
.article-row {
  padding: 24rpx 0;
  border-bottom: 1px solid #dfe5d8;

  .article-main {
    display: flex;
    gap: 26rpx;
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

    image {
      width: 100%;
      height: 100%;
    }
  }

  .article-info {
    flex: 1;
    min-width: 0;
  }

  text {
    display: block;
  }

  .chinese {
    font-size: 29rpx;
    font-weight: 500;
    line-height: 1.6;
  }

  .english {
    margin: 7rpx 0;
    font-family: var(--app-latin-font, 'DM Sans', sans-serif);
    font-size: 25rpx;
    line-height: 1.5;
  }

  .meta {
    font-size: 21rpx;
    color: #586c5b;
    line-height: 1.8;
  }
}
</style>
