<script setup lang="ts">
import { analytics } from '@/services/analytics'
import { ANALYTICS_POLICY_URL } from '@/shared/constants/analytics'

defineEmits<{ close: [] }>()
</script>
<template>
  <view class="veil" @touchmove.stop.prevent
    ><view class="sheet"
      ><text class="dialog-title">隐私说明</text
      ><scroll-view
        scroll-y
        enhanced
        :show-scrollbar="false"
        class="privacy-text"
        :class="{ 'with-analytics': analytics.available }"
        @touchmove.stop
        ><text class="paragraph"
          >微信身份用于识别同一账号，保存学习记录和收藏。手机号、微信号在账号资料页自愿填写，不填写也可学习。头像昵称由你主动设置，不会自动读取。</text
        >
        <!-- #ifdef JUYA_ANALYTICS -->
        <view v-if="analytics.available" class="analytics-section">
          <text class="section-title">使用统计</text>
          <text class="paragraph"
            >为了解页面访问、登录、学习开始与完成、收藏及分享入口的使用情况，我们使用友盟+小程序统计
            SDK（服务提供方：友盟同欣（北京）科技有限公司、北京锐讯灵通科技有限公司）分析产品使用情况，改进学习体验。</text
          >
          <text class="paragraph"
            >勾选登录页的《隐私说明》时，会同步开启使用统计；取消勾选会关闭统计。同意状态会保存在本地，后续启动沿用已保存状态。SDK
            使用随机访客标识，并处理设备型号、系统版本、语言、网络类型、访问页面及上述操作信息。不向该
            SDK 提供微信
            OpenID、账号编号、昵称、手机号、微信号、学习正文或登录令牌。随机标识不等于完全匿名，同一人在不同设备上的访问可能分别统计。</text
          >
          <text class="paragraph"
            >使用统计用于改进产品体验。再次勾选登录页的《隐私说明》会重新开启统计；取消勾选后停止采集新事件，此前已发送的数据不会自动删除。</text
          >
          <text class="paragraph">友盟个人信息处理规则：</text>
          <text class="paragraph policy-url" selectable>{{ ANALYTICS_POLICY_URL }}</text>
        </view>
        <!-- #endif --> </scroll-view
      ><button class="primary" @click="$emit('close')">我知道了</button></view
    ></view
  >
</template>
<style scoped lang="scss">
.veil {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: #2b4438;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 38.46rpx;

  .sheet {
    width: 100%;
    max-width: 653.85rpx;
    max-height: calc(100vh - 92.31rpx);
    padding: 48.08rpx 42.31rpx 42.31rpx;
    border-radius: 26.92rpx;
    background: #fffcf5;

    .dialog-title {
      display: block;
      font-size: 36.54rpx;
      font-weight: 500;
      line-height: 1.6;
      color: #2b4438;
      text-align: center;
      margin-bottom: 25rpx;
    }

    .privacy-text {
      max-height: 58vh;
    }

    .with-analytics {
      height: 58vh;
    }

    .paragraph {
      display: block;
      color: #586c5b;
      font-size: 23.08rpx;
      line-height: 1.9;
      margin-bottom: 13.46rpx;
    }

    .section-title {
      display: block;
      margin-bottom: 13.46rpx;
      color: #2b4438;
      font-size: 26.92rpx;
      font-weight: 500;
    }

    .policy-url {
      word-break: break-all;
    }

    .primary {
      margin-top: 44.23rpx;
      width: 100%;
      min-height: 80.77rpx;
      font-size: 23.08rpx;
      line-height: 1.6;
      padding: 17.31rpx 13.46rpx;
      border-radius: 19.23rpx;
      color: #2b4438;
      background: #c8e2b5;
      border-color: #c8e2b5;
    }
  }
}
</style>
