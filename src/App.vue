<script lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { defineComponent } from 'vue'

import { shouldGateStartupForDeletion } from '@/features/account/deletion-presenter'
import { getRuntimeServices } from '@/services/runtime'
import { ensureSession } from '@/services/startup'
import { useSessionStore } from '@/stores/session'

export default defineComponent({
  name: 'App',
  /** 注册应用级生命周期，在冷启动时恢复本地登录态 */
  setup() {
    onLaunch(async () => {
      getRuntimeServices()
      const session = useSessionStore()
      if (!(await ensureSession())) return

      try {
        const profile = await getRuntimeServices().profile.get()
        session.profile = profile
        if (shouldGateStartupForDeletion(profile.deletion))
          await uni.reLaunch({ url: '/sub-packages/account/deletion-pending' })
      } catch {
        // 启动期网络异常由各业务页现有降级状态处理。
      }
    })
  }
})
</script>

<style lang="scss">
@use './styles/global';
</style>
