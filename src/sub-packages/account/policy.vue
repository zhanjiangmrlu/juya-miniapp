<script setup lang="ts">
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

import AppPage from '@/components/app-page/app-page.vue'
import { finishPolicy } from '@/services/consent-coordinator'
import { privacy } from '@/services/privacy'
import { ANALYTICS_POLICY_URL } from '@/shared/constants/analytics'
const kind = ref('terms'),
  error = ref('')
const document = computed(() => privacy.policies.value.documents.find((d) => d.kind === kind.value))
onLoad(async (query) => {
  kind.value = String(query?.kind || 'terms')
  try {
    await privacy.loadPolicies()
  } catch {
    error.value = '协议暂未获取，请稍后重试'
  }
})
onUnload(() => {
  finishPolicy()
})
</script>
<template>
  <AppPage :title="document?.title || '协议说明'" back
    ><view class="policy-body"
      ><template v-if="document"
        ><text class="version">版本 {{ document.version }}</text
        ><text class="content" selectable>{{ document.content }}</text></template
      ><text v-else>{{
        error || '正式全文尚未配置，当前不取得此项同意。你可以返回继续浏览。'
      }}</text
      ><view v-if="kind === 'analytics'" class="official-policy">
        <text class="official-label">友盟官方隐私政策</text>
        <text class="official-url" selectable>{{ ANALYTICS_POLICY_URL }}</text>
      </view></view
    ></AppPage
  >
</template>
<style scoped lang="scss">
.policy-body {
  padding: 46.154rpx;
  font-size: 26.923rpx;
  line-height: 1.9;

  .version {
    display: block;
    color: #586c5b;
    margin-bottom: 30rpx;
  }

  .content {
    display: block;
    white-space: pre-wrap;
  }

  .official-policy {
    margin-top: 30rpx;
    font-size: 25rpx;
    color: #41664d;

    .official-label,
    .official-url {
      display: block;
      overflow-wrap: anywhere;
    }
  }
}
</style>
