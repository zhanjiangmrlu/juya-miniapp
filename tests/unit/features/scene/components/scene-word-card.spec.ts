// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { expect, it, vi } from 'vitest'

import SceneWordCard from '@/features/scene/components/scene-word-card.vue'

vi.mock('@/stores/audio', () => ({ useAudioStore: () => ({ snapshot: { status: 'IDLE' } }) }))
it('图片设备加载失败后显示同位重试并发送当前词条', async () => {
  const entry = {
    entry_id: 'word',
    entry_type: 'VOCABULARY',
    source_locator: 's1',
    text: 'coffee',
    image_asset_id: 'asset',
    image_url: 'expired'
  }
  const wrapper = mount(SceneWordCard, { props: { entry: entry as never } })
  await wrapper.get('.word-image image').trigger('error')
  expect(wrapper.text()).toContain('图片加载失败')
  await wrapper
    .findAll('button')
    .find((button) => button.text().includes('重试图片'))!
    .trigger('click')
  expect(wrapper.emitted('retryImage')?.[0]).toEqual([entry])
  wrapper.unmount()
})
