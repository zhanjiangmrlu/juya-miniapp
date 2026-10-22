// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { expect, it } from 'vitest'
it('keeps all English together and expands the complete ordered translation after the toggle', async () => {
  const { default: SceneDialogue } =
    await import('@/features/learning/components/scene-dialogue.vue')
  const page = mount(SceneDialogue, {
    props: {
      dialogue: [
        { id: 'one', speaker: 'A', english: 'First line.', chinese: '第一句' },
        { id: 'two', speaker: 'B', english: 'Second line.', chinese: '第二句' }
      ],
      vocabulary: []
    }
  })
  expect(page.text()).not.toContain('第一句')
  await page.get('button').trigger('click')
  expect(page.findAll('.translation').map((row) => row.text())).toEqual(['第一句', '第二句'])
  const text = page.text()
  expect(text.indexOf('Second line.')).toBeLessThan(text.indexOf('收起译文'))
  expect(text.indexOf('收起译文')).toBeLessThan(text.indexOf('第一句'))
  await page.get('button').trigger('click')
  expect(page.findAll('.translation')).toHaveLength(0)
  page.unmount()
})

it('emits exact source positions for highlighted and ordinary English words while preserving translation', async () => {
  const { default: SceneDialogue } =
    await import('@/features/learning/components/scene-dialogue.vue')
  const page = mount(SceneDialogue, {
    props: {
      dialogue: [{ id: 'line-1', speaker: 'A', english: 'Try mobile today.', chinese: '今天试试' }],
      vocabulary: [
        {
          id: 'word',
          english: 'mobile',
          meaning: '活动自如的',
          phonetic: '',
          pronunciation_text: '',
          pronunciation_issue: false,
          source: { line_id: 'line-1', start: 4, end: 10, quote: 'mobile' }
        }
      ]
    }
  })
  await page.get('.translation-toggle').trigger('click')
  await page.findAll('.dictionary-token')[0]!.trigger('click')
  await page.findAll('.dictionary-token')[1]!.trigger('click')
  expect(page.emitted('lookup')?.map((event) => event[0])).toEqual([
    expect.objectContaining({ text: 'Try', line_id: 'line-1', start: 0, end: 3 }),
    expect.objectContaining({ text: 'mobile', line_id: 'line-1', start: 4, end: 10 })
  ])
  expect(page.find('.translation-section').exists()).toBe(true)
  expect(page.findAll('.highlight').map((node) => node.text())).toEqual(['mobile'])
  page.unmount()
})
