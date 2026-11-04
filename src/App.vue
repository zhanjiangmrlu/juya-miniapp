<script setup lang="ts">
import { onHide, onLaunch, onShow } from '@dcloudio/uni-app'
import { watch } from 'vue'

import { resetLearningAudioSession } from '@/services/audio-controller'
import { preparePageShareCovers } from '@/services/page-share'
import { loadRemoteFonts } from '@/services/remote-fonts'
import { runtimeMode, syncRuntimeMode } from '@/services/runtime-mode'
import { useAccountStore } from '@/stores/account-store'

import type { RuntimeOptions } from '@/shared/types/share'
useAccountStore()
onLaunch((options) => {
  syncRuntimeMode(options)
  loadRemoteFonts()
  void preparePageShareCovers()
})
onShow((options: RuntimeOptions = {}) => {
  syncRuntimeMode(options)
  void preparePageShareCovers()
})
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
