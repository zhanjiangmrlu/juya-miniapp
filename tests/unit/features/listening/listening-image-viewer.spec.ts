// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { expect, it } from 'vitest'

import ListeningImageViewer from '@/features/listening/components/listening-image-viewer.vue'
it('connects zoom buttons to the native scale, remembers pinch and resets both zoom and pan', async () => {
  const page = mount(ListeningImageViewer, {
    props: { image: '/real-image', error: '' },
    global: {
      stubs: {
        'movable-area': { template: '<div><slot /></div>' },
        'movable-view': { template: '<div><slot /></div>' }
      }
    }
  })
  expect(page.get('.image-area').attributes('scale-area')).toBeDefined()
  await page.get('[data-action="zoom-in"]').trigger('click')
  expect(page.get('.image-pan').attributes('scale-value')).toBe('1.5')
  await page.get('.image-pan').trigger('scale', { detail: { scale: 2.5 } })
  await page.get('[data-action="zoom-out"]').trigger('click')
  expect(page.get('.image-pan').attributes('scale-value')).toBe('2')
  await page.get('.image-pan').trigger('change', { detail: { x: 30, y: 20 } })
  await page.get('[data-action="fit"]').trigger('click')
  expect(page.get('.image-pan').attributes()).toMatchObject({ 'scale-value': '1', x: '0', y: '0' })
  await page.get('.image-close').trigger('click')
  expect(page.emitted('close')).toEqual([[]])
  page.unmount()
})
