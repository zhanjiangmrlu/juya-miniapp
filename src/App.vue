<script setup lang="ts">
import { onHide, onLaunch, onShow } from '@dcloudio/uni-app'
import { watch } from 'vue'

import { analytics } from '@/services/analytics'
import { resetLearningAudioSession } from '@/services/audio-controller'
import { hasBackgroundAudioSession } from '@/services/audio-navigation'
import { prepareConsentLaunch } from '@/services/consent-coordinator'
import { preparePageShareCovers } from '@/services/page-share'
import { loadRemoteFonts } from '@/services/remote-fonts'
import { runtimeMode, syncRuntimeMode } from '@/services/runtime-mode'
import { useAccountStore } from '@/stores/account-store'

import type { RuntimeOptions } from '@/shared/types/share'
useAccountStore()
onLaunch((options) => {
  syncRuntimeMode(options)
  if (!runtimeMode.browseOnly.value) prepareConsentLaunch()
  loadRemoteFonts()
  void preparePageShareCovers()
})
onShow((options: RuntimeOptions = {}) => {
  analytics.foreground({ scene: options.scene })
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
onHide(() => {
  analytics.background()
  if (!hasBackgroundAudioSession()) resetLearningAudioSession()
})
</script>
<style lang="scss">
@import './styles/main';
</style>
