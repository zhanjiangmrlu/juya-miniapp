<script setup lang="ts">
import AudioButton from '@/features/audio/components/audio-button.vue'
import PersonalRow from '@/features/profile/components/personal-row.vue'
import { getRuntimeServices } from '@/services/runtime'
import { FavoriteType } from '@/shared/enums/favorites'
import { ProfileRowSize } from '@/shared/enums/profile'
import { useAudioStore } from '@/stores/audio'

import type { AudioTarget } from '@/shared/contracts/learning'
import type { FavoriteListEmits, FavoriteListProps } from '@/shared/types/favorites-components'
defineProps<FavoriteListProps>()
const emit = defineEmits<FavoriteListEmits>()
const audio = useAudioStore()
/** 播放独立发音，target 为当前收藏的已校对音频目标 */
const play = (target: AudioTarget) => audio.play(target, getRuntimeServices().scene)
</script>
<template>
  <view class="favorite-list">
    <view v-for="group in groups" :key="group.displayKey" class="favorite-entry">
      <PersonalRow
        :title="group.items[0]?.english || group.items[0]?.normalized_key || group.displayKey"
        :detail="
          [
            group.items[0]?.chinese,
            group.items[0]?.entry_type === FavoriteType.VOCABULARY
              ? group.sources[0]?.scene_title
              : null
          ]
            .filter(Boolean)
            .join(' · ')
        "
        badge="已收藏"
        :size="
          group.items[0]?.entry_type === FavoriteType.PHRASE
            ? ProfileRowSize.NORMAL
            : ProfileRowSize.SHORT
        "
        actionable
        @press="emit('select', group)"
      />
      <AudioButton
        v-if="group.items[0]?.audio"
        class="entry-audio"
        :target="group.items[0].audio"
        :current-key="audio.currentKey"
        :status="audio.snapshot.status"
        @play="play"
      />
    </view>
  </view>
</template>
<style scoped lang="scss">
.favorite-list {
  display: grid;
  gap: 8px;

  .favorite-entry {
    position: relative;
  }

  .entry-audio {
    position: absolute;
    right: 12px;
    bottom: 8px;
  }
}
</style>
