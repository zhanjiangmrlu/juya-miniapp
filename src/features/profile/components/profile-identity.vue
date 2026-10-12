<script setup lang="ts">
import type { ProfileIdentityEmits, ProfileIdentityProps } from '@/shared/types/profile-components'
withDefaults(defineProps<ProfileIdentityProps>(), { nickname: '学习者', avatar: null })
const emit = defineEmits<ProfileIdentityEmits>()
/** 复制本人句芽编号，value为本人服务端编号 */
const copy = (value: string) => uni.setClipboardData({ data: value })
</script>
<template>
  <view class="profile-identity">
    <button class="identity-head" aria-label="修改本人昵称和头像" @click="emit('edit')">
      <image v-if="avatar" class="identity-avatar" :src="avatar" mode="aspectFill" /><view
        v-else
        class="identity-avatar identity-placeholder"
        >芽</view
      >
      <view
        ><text class="identity-name">{{ nickname }}</text
        ><text class="identity-privacy">个人学习信息仅向你本人显示</text></view
      >
    </button>
    <button class="identity-id" aria-label="复制句芽号" @click="copy(juyaId)">
      <text>句芽号：{{ juyaId }}</text
      ><text class="identity-copy">复制</text>
    </button>
    <button class="identity-contact" aria-label="管理联系资料" @click="emit('contact')">
      <text>{{ wechatLabel }}</text
      ><text class="identity-arrow">›</text>
    </button>
  </view>
</template>
<style scoped lang="scss">
.profile-identity {
  padding: 18px 16px;
  border: 1px solid #d9e4d2;
  border-radius: 15px;
  background: #fffdf7;

  button {
    display: flex;
    width: 100%;
    min-height: 44px;
    align-items: center;
    justify-content: space-between;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: #254733;
    text-align: left;
    overflow-wrap: anywhere;

    &::after {
      border: 0;
    }
  }

  .identity-head {
    justify-content: flex-start;
    padding-bottom: 8px;
    gap: 12px;
  }

  .identity-name {
    display: block;
    font-size: 21px;
    font-weight: 700;
    line-height: 28px;
  }

  .identity-privacy {
    display: block;
    color: #657965;
    font-size: 12px;
    line-height: 22px;
  }

  .identity-avatar {
    display: block;
    width: 52px;
    height: 52px;
    flex: none;
    border: 1px solid #b4cfab;
    border-radius: 50%;
    background: #cfe4c4;
    font-size: 22px;
    font-weight: 700;
  }

  .identity-placeholder {
    display: grid;
    place-items: center;
  }

  .identity-id {
    margin-top: 0;
    padding-top: 8px;
    border-top: 1px solid #d9e4d2;
    font-size: 14px;
    line-height: 24px;
  }

  .identity-contact {
    margin-top: 8px;
    color: #657965;
    font-size: 14px;
    line-height: 24px;
  }

  .identity-copy {
    flex: none;
    color: #4e7f3b;
    font-size: 12px;
  }

  .identity-arrow {
    flex: none;
    color: #4e7f3b;
    font-size: 22px;
  }
}
</style>
