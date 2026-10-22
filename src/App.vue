<script setup lang="ts">
import { onHide, onLaunch, onShow } from '@dcloudio/uni-app'
import { watch } from 'vue'

import { resetLearningAudioSession } from '@/features/learning/learning-audio-session'
import { runtimeMode, syncRuntimeMode } from '@/services/runtime-mode'
import { useAccountStore } from '@/stores/account-store'
useAccountStore()
onLaunch(syncRuntimeMode)
onShow(syncRuntimeMode)
watch(
  runtimeMode.browseOnly,
  (restricted) => {
    if (restricted) resetLearningAudioSession()
  },
  { flush: 'sync' }
)
onHide(resetLearningAudioSession)
</script>
<style lang="scss">
@import './styles/main';
</style>
