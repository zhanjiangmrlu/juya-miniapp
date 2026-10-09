<script setup lang="ts">
import DialogueSentence from '@/features/scene/components/dialogue-sentence.vue'

import type { ClickableSpan, SceneEntry } from '@/shared/contracts/learning'
import type { DialogueListEmits, DialogueListProps } from '@/shared/types/scene-components'

withDefaults(defineProps<DialogueListProps>(), {
  currentAudioKey: null,
  catalog: () => [],
  highlightedId: '',
  hideAudio: false,
  audioSelectionVisible: true
})
const emit = defineEmits<DialogueListEmits>()
/** 转发真实片段点击，entry 为句子，span 为词条固定定位 */
const inspect = (entry: SceneEntry, span: ClickableSpan) => emit('inspect', entry, span)
</script>
<template>
  <view class="dialogue-list">
    <DialogueSentence
      v-for="entry in entries"
      :key="entry.entry_id"
      :chinese-visible="chineseVisible"
      :current-audio-key="currentAudioKey"
      :entry="entry"
      :status="status"
      :catalog="catalog"
      :highlighted="highlightedId === entry.entry_id"
      :hide-audio="hideAudio"
      :audio-selection-visible="audioSelectionVisible"
      @inspect="inspect"
      @play="emit('play', $event)"
    />
  </view>
</template>
<style scoped lang="scss">
.dialogue-list {
  display: grid;
  gap: 5px;
}
</style>
