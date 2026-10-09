<script setup lang="ts">
import FeedbackDetailView from '@/features/feedback/components/feedback-detail-view.vue'
import { useAnalyticsPage } from '@/services/analytics/use-analytics-page'
useAnalyticsPage('sub-packages/feedback/detail')
</script>

<template><FeedbackDetailView /></template>
