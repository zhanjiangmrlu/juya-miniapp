<script lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { defineComponent } from 'vue'

import { useSessionStore } from '@/stores/session'

export default defineComponent({
  name: 'App',
  /** 注册应用级生命周期，在冷启动时恢复本地登录态。 */
  setup() {
    onLaunch(() => {
      useSessionStore().restore()
    })
  }
})
</script>

<style lang="scss">
@use './styles/global';
</style>
