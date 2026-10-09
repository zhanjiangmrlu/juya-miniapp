<script setup lang="ts">
import FavoriteBankPage from '@/features/favorites/components/favorite-bank-page.vue'
import { FavoriteType } from '@/shared/enums/favorites'
</script>

<template>
  <FavoriteBankPage :initial-tab="FavoriteType.PHRASE" />
</template>
