<script setup lang="ts">
import FavoriteBankPage from '@/features/favorites/components/favorite-bank-page.vue'
import { useAnalyticsPage } from '@/services/analytics/use-analytics-page'
useAnalyticsPage('pages/favorites/index')
</script>

<template>
  <FavoriteBankPage />
</template>
