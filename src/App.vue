<script setup lang="ts">
import { onHide, onLaunch, onShow } from '@dcloudio/uni-app'
import { watch } from 'vue'

import { analytics } from '@/services/analytics'
import { appUpdates } from '@/services/app-update'
import { resetLearningAudioSession } from '@/services/audio-controller'
import { hasBackgroundAudioSession } from '@/services/audio-navigation'
import { preparePageShareCovers } from '@/services/page-share'
import { configurePrivacyAnalytics } from '@/services/privacy-analytics'
import { loadRemoteFonts } from '@/services/remote-fonts'
import { runtimeMode, syncRuntimeMode } from '@/services/runtime-mode'
import { useAccountStore } from '@/stores/account-store'

import type { RuntimeOptions } from '@/shared/types/share'
configurePrivacyAnalytics(useAccountStore())
onLaunch((options) => {
  appUpdates.launch()
  syncRuntimeMode(options)
  loadRemoteFonts()
  void preparePageShareCovers()
})
onShow((options: RuntimeOptions = {}) => {
  appUpdates.show()
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
  appUpdates.hide()
  analytics.background()
  if (!hasBackgroundAudioSession()) resetLearningAudioSession()
})
</script>
<style lang="scss">
@import './styles/main';
</style>
