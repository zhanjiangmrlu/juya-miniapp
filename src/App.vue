<script setup lang="ts">
import { onHide, onLaunch, onShow } from '@dcloudio/uni-app'
import { watch } from 'vue'

import { resetLearningAudioSession } from '@/features/learning/learning-audio-session'
import { loadRemoteFonts } from '@/services/remote-fonts'
import { runtimeMode, syncRuntimeMode } from '@/services/runtime-mode'
import { useAccountStore } from '@/stores/account-store'
useAccountStore()
onLaunch((options) => {
  syncRuntimeMode(options)
  loadRemoteFonts()
})
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
