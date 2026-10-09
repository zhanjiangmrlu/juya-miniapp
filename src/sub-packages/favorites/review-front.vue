<script setup lang="ts">
import ReviewPageView from '@/features/favorites/components/review-page-view.vue'
import { ReviewCardFace } from '@/shared/enums/favorites'
</script>

<template>
  <ReviewPageView :face="ReviewCardFace.FRONT" />
</template>
