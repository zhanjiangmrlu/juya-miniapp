<script setup lang="ts">
import { onHide } from '@dcloudio/uni-app'

import { resetLearningAudioSession } from '@/features/learning/learning-audio-session'
import { useAccountStore } from '@/stores/account-store'
useAccountStore()
onHide(resetLearningAudioSession)
</script>
<style lang="scss">
@import './styles/main';
</style>
