// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { expect, it } from 'vitest'

import ShareSheet from '@/features/share/components/share-sheet.vue'

it('shows preparation immediately and isolates channel retry and native share readiness', async () => {
  const page = mount(ShareSheet, {
    props: {
      scene: true,
      friends: { title: '公开标题', path: '/scene?target=scene&id=one', imageUrl: '/friends' },
      timeline: { title: '公开标题', query: 'target=scene&id=one', imageUrl: '/timeline' },
      channels: {
        friends: { ready: false, busy: true, error: '' },
        timeline: { ready: true, busy: false, error: '' }
      }
    }
  })
  expect(page.text()).toContain('正在准备')
  expect(page.find('[open-type="share"]').exists()).toBe(false)
  await page.setProps({
    channels: {
      friends: { ready: false, busy: false, error: '好友下载失败' },
      timeline: { ready: true, busy: false, error: '' }
    }
  })
  expect(page.text()).toContain('好友下载失败')
  await page.get('.share-retry').trigger('click')
  expect(page.emitted('retry')).toEqual([['friends']])
  await page.findAll('.channel-button')[1]!.trigger('click')
  expect(page.text()).not.toContain('好友下载失败')
  expect(page.find('.preview-image').attributes('src')).toBe('/timeline')
  expect(page.text()).toContain('从右上角菜单分享')
  await page.setProps({
    channels: {
      friends: { ready: true, busy: false, error: '' },
      timeline: { ready: true, busy: false, error: '' }
    }
  })
  await page.findAll('.channel-button')[0]!.trigger('click')
  expect(page.find('[open-type="share"]').exists()).toBe(true)
})
