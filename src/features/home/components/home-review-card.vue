<script setup lang="ts">
const emit = defineEmits<{ review: [] }>()

/** 请求打开词汇银行和语块银行。 */
function handleReview() {
  emit('review')
}
</script>

<template>
  <button class="review-card" @click="handleReview">
    <view class="review-copy">
      <text class="review-title">开始复习</text>
      <text class="review-description">{{ '词汇银行与语块银行  ·  收藏持续保留' }}</text>
    </view>
    <text class="review-arrow" aria-hidden="true">›</text>
  </button>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.review-card {
  display: flex;
  width: 100%;
  min-height: tokens.home-size(83);
  align-items: flex-start;
  justify-content: space-between;
  margin: tokens.home-size(16) 0 0;
  padding: tokens.home-size(13) tokens.home-size(11) tokens.home-size(17) tokens.home-size(15);
  border: tokens.home-size(1) solid tokens.$home-card-border;
  border-radius: tokens.home-size(16);
  background: tokens.$home-card;
  color: tokens.$home-ink;
  line-height: normal;
  text-align: left;

  &::after {
    border: 0;
  }

  .review-copy {
    min-width: 0;
  }

  .review-title,
  .review-description {
    display: block;
  }

  .review-title {
    @include tokens.home-glyph;

    font-size: tokens.home-size(16);
    font-weight: 700;
    line-height: tokens.home-size(26);
  }

  .review-description {
    @include tokens.home-glyph;

    margin-top: tokens.home-size(3);
    color: tokens.$home-muted;
    font-size: tokens.home-size(12);
    line-height: tokens.home-size(20);
    white-space: pre-wrap;
  }

  .review-arrow {
    width: tokens.home-size(22);
    flex-shrink: 0;
    margin-top: tokens.home-size(11);
    margin-left: tokens.home-size(8);
    font-size: tokens.home-size(24);
    line-height: tokens.home-size(28);
  }
}
</style>
