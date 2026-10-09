<script setup lang="ts">
import type { PersonalRowEmits, PersonalRowProps } from '@/shared/types/profile-components'

withDefaults(defineProps<PersonalRowProps>(), {
  badge: '',
  badgeIcon: '',
  size: 'normal',
  actionable: false,
  danger: false
})
const emit = defineEmits<PersonalRowEmits>()
/** 只对具有业务入口的信息行发送点击事件 */
const press = () => emit('press')
</script>
<template>
  <button v-if="actionable" class="personal-row" :class="[size, { danger }]" @click="press">
    <view class="row-heading"
      ><text class="row-title">{{ title }}</text
      ><image v-if="badgeIcon" class="row-icon" :src="badgeIcon" aria-hidden="true" />
      <text v-else class="row-badge">{{ badge }}</text></view
    ><text class="row-detail">{{ detail }}</text
    ><slot />
  </button>
  <view v-else class="personal-row" :class="[size, { danger }]"
    ><view class="row-heading"
      ><text class="row-title">{{ title }}</text
      ><image v-if="badgeIcon" class="row-icon" :src="badgeIcon" aria-hidden="true" />
      <text v-else class="row-badge">{{ badge }}</text></view
    ><text class="row-detail">{{ detail }}</text
    ><slot
  /></view>
</template>
<style scoped lang="scss">
.personal-row {
  display: block;
  width: 100%;
  min-height: 91px;
  margin: 0;
  padding: 9px 13px 12px;
  border: 1px solid #d6dfc9;
  border-radius: 12px;
  background: #fffdf7;
  color: #254733;
  text-align: left;

  .row-heading {
    display: flex;
    min-height: 24px;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }

  .row-title {
    min-width: 0;
    font-size: 14px;
    font-weight: 700;
    line-height: 24px;
    overflow-wrap: anywhere;
  }

  .row-badge {
    flex-shrink: 0;
    color: #4e7f3b;
    font-size: 10px;
    font-weight: 500;
    line-height: 23px;
  }

  .row-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    align-self: center;
    margin-right: 3px;
  }

  .row-detail {
    display: block;
    margin-top: 4px;
    color: #6b7d6a;
    font-size: 11px;
    line-height: 19px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  &.short {
    min-height: 80px;
  }

  &.tall {
    min-height: 105px;
  }

  &.small {
    min-height: 62px;
    padding-bottom: 4px;

    .row-detail {
      line-height: 18px;
    }
  }

  &.danger .row-badge {
    color: #a8432e;
  }
}
</style>
