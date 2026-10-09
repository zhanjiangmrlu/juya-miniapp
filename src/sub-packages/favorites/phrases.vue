<script setup lang="ts">
import FavoriteBankPage from '@/features/favorites/components/favorite-bank-page.vue'
import { useAnalyticsPage } from '@/services/analytics/use-analytics-page'
import { FavoriteType } from '@/shared/enums/favorites'
useAnalyticsPage('sub-packages/favorites/phrases')
</script>

<template>
  <FavoriteBankPage :initial-tab="FavoriteType.PHRASE" />
</template>
