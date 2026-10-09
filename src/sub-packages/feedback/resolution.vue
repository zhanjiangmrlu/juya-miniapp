<script setup lang="ts">
import FeedbackDetailView from '@/features/feedback/components/feedback-detail-view.vue'
import { useAnalyticsPage } from '@/services/analytics/use-analytics-page'
useAnalyticsPage('sub-packages/feedback/resolution')
</script>

<template><FeedbackDetailView result-mode /></template>
