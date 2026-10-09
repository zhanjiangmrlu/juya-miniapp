<script setup lang="ts">
import ReviewPageView from '@/features/favorites/components/review-page-view.vue'
import { useAnalyticsPage } from '@/services/analytics/use-analytics-page'
import { ReviewCardFace } from '@/shared/enums/favorites'
useAnalyticsPage('sub-packages/favorites/review-front')
</script>

<template>
  <ReviewPageView :face="ReviewCardFace.FRONT" />
</template>
