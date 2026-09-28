<script lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { defineComponent } from 'vue'

import { useSessionStore } from '@/stores/session'

export default defineComponent({
  name: 'App',
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
