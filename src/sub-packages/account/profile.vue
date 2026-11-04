<script setup lang="ts">
import { onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'

import { usePageShareEntry } from '@/composables/use-page-share-entry'
import ProfilePageView from '@/features/profile/components/profile-page-view.vue'
import { pageShare } from '@/services/page-share'

usePageShareEntry()

onShareAppMessage(() => ({ ...pageShare.friends }))
onShareTimeline(() => ({ ...pageShare.timeline }))
</script>
<template><ProfilePageView /></template>
