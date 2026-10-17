// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { expect, it, vi } from 'vitest'

import LearningStatistics from '@/features/learning/components/learning-statistics.vue'
import { RecordsTab } from '@/shared/enums/learning'

it('switches records in the current page when a selection handler is provided', async () => {
  const navigateTo = vi.fn(),
    select = vi.fn()
  vi.stubGlobal('uni', { navigateTo })
  try {
    const wrapper = mount(LearningStatistics, {
      props: {
        statistics: {
          completed_cards: 4,
          current_streak: 2,
          total_checkin_days: 3,
          date: '2026-10-17',
          longest_streak: 2,
          checked_in_today: true,
          today_completed_cards: 1,
          last_studied_at: null,
          favorite_count: 1
        },
        onSelect: select
      }
    })
    await wrapper.findAll('button')[1]!.trigger('click')
    expect(select).toHaveBeenCalledWith(RecordsTab.CHECKINS)
    expect(navigateTo).not.toHaveBeenCalled()
    wrapper.unmount()
  } finally {
    vi.unstubAllGlobals()
  }
})
