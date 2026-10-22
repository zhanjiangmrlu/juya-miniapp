// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { expect, it } from 'vitest'

import SceneListFooter from '@/features/learning/components/scene-list-footer.vue'

it('keeps pagination loading local, then retries failure without reporting the list as done', async () => {
  const page = mount(SceneListFooter, {
    props: { busy: true, error: '', hasMore: true, done: false }
  })
  expect(page.find('[role="status"]').exists()).toBe(true)
  expect(page.find('button').exists()).toBe(false)
  await page.setProps({ busy: false, error: 'offline', hasMore: false, done: true })
  expect(page.text()).not.toContain('已全部加载')
  await page.get('button').trigger('click')
  expect(page.emitted('more')).toHaveLength(1)
  await page.setProps({ error: '' })
  expect(page.text()).toContain('已全部加载')
})
