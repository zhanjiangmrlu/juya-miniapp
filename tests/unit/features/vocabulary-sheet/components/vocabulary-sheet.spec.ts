// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import VocabularySheet from '@/features/vocabulary-sheet/components/vocabulary-sheet.vue'

import type { SceneEntryType } from '@/shared/enums/learning'

vi.mock('@dcloudio/uni-app', () => ({ onShow: vi.fn(), onHide: vi.fn(), onUnload: vi.fn() }))

describe('词卡收藏提示', () => {
  it.each(['FUTURE', 'toString', 'constructor', '__proto__'])(
    '未识别词条类型 %s 沿用词汇收藏文案',
    (entryType) => {
      const wrapper = mount(VocabularySheet, {
        props: {
          entry: {
            entry_id: 'word',
            source_locator: 's1',
            entry_type: entryType as SceneEntryType,
            text: 'hello'
          },
          status: 'IDLE'
        }
      })
      expect(wrapper.get('.sheet-favorite').text()).toBe('♡  收藏词汇')
      wrapper.unmount()
    }
  )
  it('切换词汇到语块再收藏时更新文案和按钮状态', async () => {
    const entry = {
      entry_id: 'word',
      source_locator: 's1',
      entry_type: 'VOCABULARY' as const,
      text: 'hello'
    }
    const wrapper = mount(VocabularySheet, { props: { entry, status: 'IDLE' } })
    expect(wrapper.get('.sheet-favorite').text()).toBe('♡  收藏词汇')
    const phrase = { ...entry, entry_type: 'PHRASE' as const }
    await wrapper.setProps({ entry: phrase })
    expect(wrapper.get('.sheet-favorite').text()).toBe('♡  收藏语块')
    await wrapper.get('.sheet-favorite').trigger('click')
    expect(wrapper.emitted('favorite')).toEqual([[phrase]])
    await wrapper.setProps({ entry: { ...phrase, favorited: true } })
    expect(wrapper.get('.sheet-favorite').text()).toBe('♡  已收藏')
    expect((wrapper.get('.sheet-favorite').element as HTMLButtonElement).disabled).toBe(true)
    wrapper.unmount()
  })
})
