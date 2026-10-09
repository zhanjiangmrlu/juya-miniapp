<script setup lang="ts">
import type { SceneEntry } from '@/shared/contracts/learning'
import type { EntryListEmits, EntryListProps } from '@/shared/types/scene-components'

withDefaults(defineProps<EntryListProps>(), { currentAudioKey: null, sentences: () => [] })
const emit = defineEmits<EntryListEmits>()
/** 转换来源句编号，entry 为当前词条，sentences 为发布句子顺序 */
const sourceNumber = (entry: SceneEntry, sentences: SceneEntry[]) => {
  const indexes = sentences
    .map((sentence, index) =>
      entry.source_sentence_ids?.includes(sentence.entry_id) ? index + 1 : 0
    )
    .filter(Boolean)
  return indexes.length ? ` · 来源：第 ${indexes.join('、')} 句` : ''
}
</script>
<template>
  <view class="entry-list">
    <button
      v-for="entry in entries"
      :key="entry.entry_id"
      class="entry-card"
      @click="emit('inspect', entry)"
    >
      <view class="entry-top"
        ><text class="entry-text"
          >{{ entry.text
          }}<text v-if="entry.phonetic && entry.entry_type === 'VOCABULARY'" class="entry-phonetic">
            {{ entry.phonetic }}</text
          ></text
        ><text class="entry-type">{{
          entry.entry_type === 'PHRASE' ? '可点语块' : '可点词'
        }}</text></view
      ><text class="entry-meaning"
        >{{ entry.chinese
        }}{{ entry.entry_type === 'VOCABULARY' ? sourceNumber(entry, sentences) : '' }}</text
      >
    </button>
  </view>
</template>
<style scoped lang="scss">
.entry-list {
  display: grid;
  gap: 10px;

  .entry-card {
    width: 100%;
    min-height: 91px;
    margin: 0;
    padding: 9px 13px;
    border: 1px solid #d6dfc9;
    border-radius: 12px;
    background: #fffdf7;
    color: #254733;
    text-align: left;
  }

  .entry-top {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    font-size: 14px;
    font-weight: 700;
    line-height: 24px;
    gap: 10px;

    .entry-text {
      min-width: 0;
      overflow-wrap: anywhere;
    }

    .entry-type {
      flex: none;
      color: #4e7f3b;
      font-size: 10px;
      font-weight: 500;
      line-height: 23px;
    }
  }

  .entry-meaning {
    display: block;
    margin-top: 4px;
    color: #6b7d6a;
    font-size: 11px;
    line-height: 22px;
  }
}
</style>
