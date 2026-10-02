<script setup lang="ts">
withDefaults(
  defineProps<{ juyaId: string; wechatLabel: string; nickname?: string; avatar?: string | null }>(),
  { nickname: '学习者', avatar: null }
)
const emit = defineEmits<{ contact: [] }>()
/** 复制本人句芽编号，value 为本人服务端编号 */
const copy = (value: string) => uni.setClipboardData({ data: value })
</script>
<template>
  <view class="profile-identity">
    <text class="identity-name">{{ nickname }}</text>
    <button class="identity-id" aria-label="复制句芽号" @click="copy(juyaId)">
      句芽号：{{ juyaId }}
    </button>
    <button class="identity-contact" aria-label="管理联系资料" @click="emit('contact')">
      {{ wechatLabel }}
    </button>
    <image v-if="avatar" class="identity-avatar" :src="avatar" mode="aspectFill" />
    <view v-else class="identity-avatar">芽</view>
  </view>
</template>
<style scoped lang="scss">
.profile-identity {
  position: relative;
  min-height: 118px;
  padding: 12px 16px 10px;
  border-radius: 15px;
  background: #e5efdc;

  .identity-name {
    display: block;
    min-height: 23px;
    color: #4e7f3b;
    font-size: 12px;
    line-height: 20px;
  }

  .identity-id,
  .identity-contact {
    width: calc(100% - 55px);
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

  .identity-id {
    min-height: 45px;
    font-size: 21px;
    font-weight: 700;
    line-height: 32px;
  }

  .identity-contact {
    width: 100%;
    margin-top: 2px;
    color: #657965;
    font-size: 11px;
    line-height: 20px;
  }

  .identity-avatar {
    position: absolute;
    top: 19px;
    right: 15px;
    display: grid;
    width: 51px;
    height: 51px;
    place-items: center;
    border: 1px solid #b4cfab;
    border-radius: 26px;
    background: #cfe4c4;
    font-size: 22px;
    font-weight: 700;
  }
}
</style>
