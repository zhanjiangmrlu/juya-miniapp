// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'

const ports = vi.hoisted(() => ({ owner: 'first', run: vi.fn(), scroll: 0 }))
vi.mock('@/services/api', () => ({
  session: { userId: () => ports.owner },
  operations: { run: ports.run, pending: () => false, recover: vi.fn() }
}))
import { useReadingPosition } from '@/composables/use-reading-position'

import type { PublishedScene } from '@/shared/types/learning'

beforeEach(() => {
  vi.clearAllMocks()
  ports.owner = 'first'
  ports.scroll = 0
  ports.run.mockResolvedValue(undefined)
  vi.stubGlobal('uni', {
    pageScrollTo: vi.fn(({ scrollTop, complete }) => {
      ports.scroll = scrollTop
      complete?.()
    }),
    createSelectorQuery: () => {
      const query = {
        in: () => query,
        selectAll: () => query,
        fields: (_options: unknown, callback: (value: unknown) => void) => {
          callback([
            { top: 550 - ports.scroll, height: 100, dataset: { readingAnchor: 'dialogue:line-1' } }
          ])
          return query
        },
        exec: vi.fn()
      }
      return query
    }
  })
})
afterEach(() => vi.unstubAllGlobals())

/** 挂载实际阅读位置组合逻辑，不依赖页面截图或假滚动保存 */
const open = () => {
  const scene = ref({
    card_id: 'card',
    version_id: 'v1',
    reading_position: { version_id: 'v1', anchor: 'dialogue:line-1', progress: 0.5 }
  } as PublishedScene)
  let reading!: ReturnType<typeof useReadingPosition>
  const page = mount(
    defineComponent({
      setup: () => {
        reading = useReadingPosition({ scene, cardId: () => 'card', children: () => [] })
        return () => h('div')
      }
    })
  )
  return { page, reading, scene }
}

it('restores a real measured anchor and saves only after a genuine change in reading position', async () => {
  const { page, reading, scene } = open()
  await reading.restore(scene.value!)
  expect(uni.pageScrollTo).toHaveBeenCalledWith(expect.objectContaining({ scrollTop: 512 }))
  reading.scroll(512)
  await reading.save()
  expect(ports.run).not.toHaveBeenCalled()
  ports.scroll = 530
  reading.scroll(530)
  await reading.save()
  expect(ports.run).toHaveBeenCalledWith(
    'reading:card:v1',
    '/api/mini/v1/cards/card/reading-position',
    'PUT',
    { version_id: 'v1', anchor: 'dialogue:line-1', progress: 0.68 }
  )
  reading.dispose()
  page.unmount()
})

it('does not save the previous account reading position after another account takes over the session', async () => {
  const { page, reading, scene } = open()
  await reading.restore(scene.value!)
  ports.scroll = 530
  reading.scroll(530)
  ports.owner = 'second'
  await reading.save()
  expect(ports.run).not.toHaveBeenCalled()
  reading.dispose()
  page.unmount()
})
