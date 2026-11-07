// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'

const ports = vi.hoisted(() => ({ owner: 'first', run: vi.fn(), scroll: 0 }))
vi.mock('@/services/api', () => ({
  session: { identity: () => ports.owner, userId: () => ports.owner },
  operations: { run: ports.run, pending: () => false, recover: vi.fn() }
}))
import { useReadingPosition } from '@/sub-packages/scenes/use-reading-position'

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

it.each(['before', 'after'] as const)(
  'keeps login snapshot scroll readonly when its event arrives %s native completion, then saves real scrolling',
  async (order) => {
    const { page, reading, scene } = open()
    scene.value.reading_position = null
    vi.mocked(uni.pageScrollTo).mockImplementation((options = {}) => {
      const { scrollTop = 0, complete } = options
      ports.scroll = scrollTop
      if (order === 'before') reading.scroll(scrollTop)
      complete?.({ errMsg: 'ok' })
      if (order === 'after') reading.scroll(scrollTop)
    })
    await reading.restore(scene.value, 530)
    expect(ports.scroll).toBe(530)
    await reading.save()
    expect(ports.run).not.toHaveBeenCalled()
    reading.startUserScroll(new Event('touchmove'))
    ports.scroll = 540
    reading.scroll(540)
    await reading.save()
    expect(ports.run).toHaveBeenCalledExactlyOnceWith(
      'reading:card:v1',
      '/api/mini/v1/cards/card/reading-position',
      'PUT',
      { version_id: 'v1', anchor: 'dialogue:line-1', progress: 0.78 }
    )
    page.unmount()
  }
)
it('prefers the account anchor over a login display snapshot without saving either restoration', async () => {
  const { page, reading, scene } = open()
  await reading.restore(scene.value, 530)
  expect(ports.scroll).toBe(512)
  reading.scroll(512)
  await reading.save()
  expect(ports.run).not.toHaveBeenCalled()
  page.unmount()
})

it.each(['before', 'after'] as const)(
  'never saves clamped or layout-driven snapshot scroll %s completion until real scroll input',
  async (order) => {
    const { page, reading, scene } = open()
    scene.value.reading_position = null
    vi.mocked(uni.pageScrollTo).mockImplementation((options = {}) => {
      expect(options.scrollTop).toBe(530)
      ports.scroll = 500
      if (order === 'before') reading.scroll(500)
      options.complete?.({ errMsg: 'ok' })
      if (order === 'after') reading.scroll(500)
    })
    await reading.restore(scene.value, 530)
    await reading.save()
    expect(ports.run).not.toHaveBeenCalled()
    for (const value of [495, 490, 485]) {
      ports.scroll = value
      reading.scroll(value)
      await reading.save()
    }
    expect(ports.run).not.toHaveBeenCalled()
    reading.startUserScroll(new Event('touchmove'))
    ports.scroll = 480
    reading.scroll(480)
    await reading.save()
    expect(ports.run).toHaveBeenCalledExactlyOnceWith(
      'reading:card:v1',
      '/api/mini/v1/cards/card/reading-position',
      'PUT',
      { version_id: 'v1', anchor: 'dialogue:line-1', progress: 0.18 }
    )
    page.unmount()
  }
)
it.each(['wheel', 'PageDown'] as const)(
  'ends only the snapshot readonly fence after an actual %s scroll input',
  async (kind) => {
    const { page, reading, scene } = open()
    scene.value.reading_position = null
    await reading.restore(scene.value, 530)
    reading.startUserScroll(new KeyboardEvent('keydown', { key: 'a' }))
    ports.scroll = 500
    reading.scroll(500)
    await reading.save()
    expect(ports.run).not.toHaveBeenCalled()
    reading.startUserScroll(
      kind === 'wheel' ? new Event('wheel') : new KeyboardEvent('keydown', { key: kind })
    )
    ports.scroll = 490
    reading.scroll(490)
    await reading.save()
    expect(ports.run).toHaveBeenCalledExactlyOnceWith(
      'reading:card:v1',
      '/api/mini/v1/cards/card/reading-position',
      'PUT',
      { version_id: 'v1', anchor: 'dialogue:line-1', progress: 0.28 }
    )
    page.unmount()
  }
)

it('re-enters readonly display mode for every later login snapshot after an earlier real scroll', async () => {
  const { page, reading, scene } = open()
  scene.value.reading_position = null
  await reading.restore(scene.value, 530)
  reading.startUserScroll(new Event('touchmove'))
  ports.scroll = 480
  reading.scroll(480)
  await reading.save()
  expect(ports.run).toHaveBeenCalledTimes(1)
  ports.run.mockClear()
  await reading.restore(scene.value, 530)
  ports.scroll = 500
  reading.scroll(500)
  await reading.save()
  expect(ports.run).not.toHaveBeenCalled()
  page.unmount()
})
