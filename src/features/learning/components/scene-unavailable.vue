<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'

import { mediaAddress } from '@/services/media-service'
import { backTo } from '@/services/navigation'
import { sceneImageId, sceneThumbnailURL } from '@/services/scene-image'
import { Routes } from '@/shared/constants/navigation'

import type { SceneUnavailableProps } from '@/shared/types/learning-components'
const props = defineProps<SceneUnavailableProps>()
const emit = defineEmits<{ unfavorite: [] }>()
const thumbnail = ref('')
let generation = 0
/** 仅获取摘要允许的历史缩略图，不读取下线正文或音频 */
const loadThumbnail = async () => {
  const run = ++generation
  thumbnail.value = ''
  const thumbnailId = sceneImageId(props.summary.thumbnail_id)
  if (!thumbnailId) return
  try {
    const value = await mediaAddress(props.summary.id, thumbnailId, null, true).then(
      sceneThumbnailURL
    )
    if (run === generation) thumbnail.value = value
  } catch {
    /* 缩略图失败时保留安全名称与不可用状态 */
  }
}
/** 返回实际来源列表，保留该列表的标签和位置 */
const returnToList = () => (props.sharedEntry ? uni.switchTab({ url: Routes.LEARNING }) : backTo())
watch(() => [props.summary.id, props.summary.thumbnail_id], loadThumbnail, { immediate: true })
onBeforeUnmount(() => {
  generation++
})
</script>
<template>
  <view class="unavailable">
    <view class="unavailable-art">
      <image
        v-if="thumbnail"
        :src="thumbnail"
        :webp="true"
        mode="aspectFit"
        alt="历史场景缩略图"
        @error="thumbnail = ''"
      />
      <text v-else>场景暂不可用</text>
    </view>
    <text class="title">{{ summary.name }}</text>
    <text v-if="summary.title_en" class="english-title">{{ summary.title_en }}</text>
    <text class="description">{{
      summary.unavailable_reason === 'deleted'
        ? '这张场景卡已被删除。'
        : '这张场景卡已下线，暂时无法学习。'
    }}</text>
    <text class="description">已有学习记录和打卡数据会保留。</text>
    <button v-if="summary.state.favorite" :disabled="favoriteBusy" @click="emit('unfavorite')">
      {{ favoriteBusy ? '处理中…' : '取消整卡收藏' }}
    </button>
    <button class="primary" @click="returnToList">
      {{ sharedEntry ? '返回学习页' : '返回列表' }}
    </button>
    <text v-if="message" class="description">{{ message }}</text>
  </view>
</template>
<style scoped lang="scss">
.unavailable {
  text-align: center;

  .unavailable-art {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 190.385rpx;
    height: 284.615rpx;
    border: 1px solid #dfe5d8;
    border-radius: 9.615rpx;
    overflow: hidden;
    background: #fff;
    margin: 67.308rpx auto 46.154rpx;
    color: #586c5b;
    font-size: 21.154rpx;

    image {
      width: 100%;
      height: 100%;
    }
  }

  .title {
    display: block;
    font-size: 38.462rpx;
    font-weight: 500;
    line-height: 1.6;
  }

  .english-title {
    display: block;
    font-family: Fraunces, Georgia, serif;
    font-size: 34.615rpx;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }

  .description {
    display: block;
    font-size: 23.077rpx;
    line-height: 1.9;
    color: #586c5b;
    margin: 25rpx 0;
  }

  button {
    width: 100%;
    margin-top: 28.846rpx;
  }
}
</style>
