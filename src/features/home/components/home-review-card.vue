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
      <text class="review-description">词汇银行与语块银行 · 收藏持续保留</text>
    </view>
    <text class="review-arrow" aria-hidden="true">›</text>
  </button>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as tokens;

.review-card {
  display: flex;
  width: 100%;
  min-height: 83px;
  align-items: center;
  justify-content: space-between;
  margin: 16px 0 0;
  padding: 13px 15px 17px;
  border: 1px solid tokens.$home-card-border;
  border-radius: 16px;
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
    font-size: 16px;
    font-weight: 700;
    line-height: 26px;
  }

  .review-description {
    margin-top: 3px;
    color: tokens.$home-muted;
    font-size: 12px;
    line-height: 20px;
  }

  .review-arrow {
    margin-left: 8px;
    font-size: 24px;
    line-height: 28px;
  }

  @media (width <= 375px) {
    min-height: 79px;
    padding-bottom: 13px;
  }
}
</style>
