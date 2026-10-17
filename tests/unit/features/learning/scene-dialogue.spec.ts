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
