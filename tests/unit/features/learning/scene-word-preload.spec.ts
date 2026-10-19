// @vitest-environment happy-dom
import { flushPromises, shallowMount } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { reactive } from 'vue'

const ports = vi.hoisted(() => ({
  load: null as null | ((query: Record<string, string>) => void),
  hide: null as null | (() => void),
  show: null as null | (() => void),
  unload: null as null | (() => void),
  expired: null as null | (() => void),
  request: vi.fn(),
  file: vi.fn(),
  media: vi.fn(),
  fullFile: vi.fn(),
  fullRelease: vi.fn(),
  release: vi.fn(),
  unsubscribe: vi.fn(),
  ensure: vi.fn(async () => true),
  account: null as null | { profile: { id: string } | null; restore: () => Promise<unknown> },
  tracks: [] as { src: string; play: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> }[]
}))
vi.mock('@dcloudio/uni-app', () => ({
  onLoad: (callback: typeof ports.load) => {
    ports.load = callback
  },
  onShow: (callback: typeof ports.show) => {
    ports.show = callback
  },
  onHide: (callback: typeof ports.hide) => {
    ports.hide = callback
  },
  onUnload: (callback: typeof ports.unload) => {
    ports.unload = callback
  }
}))
vi.mock('@/stores/account-store', () => ({
  useAccountStore: () => Object.assign(ports.account!, { ensure: ports.ensure })
}))
vi.mock('@/services/api', () => ({
  operations: {},
  session: { request: ports.request, userId: () => ports.account?.profile?.id || null },
  onSessionExpired: (callback: () => void) => {
    ports.expired = callback
    return ports.unsubscribe
  }
}))
vi.mock('@/services/platform', () => ({
  operationKey: () => 'key',
  resourceURL: (url: string) => url
}))
vi.mock('@/services/word-audio-file', () => ({
  prepareWordAudioFile: ports.file,
  prepareAudioCacheFile: ports.fullFile
}))
vi.mock('@/services/media-service', () => ({ mediaAddress: ports.media }))
vi.mock('@/services/audio-port', () => ({
  createAudioPort: () => {
    const track = {
      src: '',
      currentTime: 0,
      duration: 10,
      playbackRate: 1,
      play: vi.fn(),
      pause: vi.fn(),
      stop: vi.fn(),
      seek: vi.fn(),
      destroy: vi.fn(),
      onPlay: vi.fn(),
      onPause: vi.fn(),
      onEnded: vi.fn(),
      onError: vi.fn(),
      onTimeUpdate: vi.fn()
    }
    ports.tracks.push(track)
    return track
  }
}))

/** 返回场景测试所需的最小已发布内容 */
const scene = () => ({
  id: 'card',
  version_id: 'v1',
  audio_duration: 10,
  state: { favorite: false, completed: false, today_completed: false },
  content: {
    name: '场景',
    title_en: '',
    image_id: null,
    audio_id: 'full',
    dialogue: [],
    vocabulary: [
      { id: 'one', english: 'hello' },
      { id: 'two', english: 'world' }
    ]
  }
})

beforeEach(() => {
  vi.clearAllMocks()
  ports.tracks.length = 0
  ports.account = reactive({ profile: { id: 'learner' }, restore: vi.fn(async () => null) })
  ports.request.mockImplementation(async (path: string) =>
    path.includes('/pronunciation')
      ? { state: 'ready', url: '/api/mini/v1/pronunciation/ticket' }
      : scene()
  )
  ports.file.mockResolvedValue({ src: 'wxfile://word.mp3', release: ports.release })
  ports.media.mockResolvedValue('/api/mini/v1/media/full-ticket')
  ports.fullFile.mockResolvedValue({ src: 'wxfile://full.mp3', release: ports.fullRelease })
})
afterEach(() => vi.useRealTimers())

/** 加载真正的场景页面，并只替换展示组件 */
const open = async () => {
  const { default: Detail } = await import('@/sub-packages/scenes/detail.vue')
  const page = shallowMount(Detail, {
    global: { stubs: { AppPage: { template: '<div><slot /><slot name="footer" /></div>' } } }
  })
  ports.load?.({ id: 'card' })
  await flushPromises()
  return page
}

it('prepares the current vocabulary after showing the scene and plays locally without another request', async () => {
  const page = await open()
  expect(ports.file).toHaveBeenCalledTimes(2)
  expect(ports.tracks).toHaveLength(2)
  expect(ports.tracks.every((track) => track.play.mock.calls.length === 0)).toBe(true)
  const calls = ports.request.mock.calls.length
  page.getComponent({ name: 'scene-vocabulary' }).vm.$emit('play', 'one')
  expect(ports.tracks[1]!.src).toBe('wxfile://word.mp3')
  expect(ports.tracks[1]!.play).toHaveBeenCalledTimes(1)
  expect(ports.request).toHaveBeenCalledTimes(calls)
  expect(ports.file).toHaveBeenCalledTimes(2)
  ports.unload?.()
  page.unmount()
})

it('prepares complete audio independently and plays its cached file in the original click event', async () => {
  const page = await open()
  expect(ports.media).toHaveBeenCalledExactlyOnceWith('card', 'full', 'v1', false, true)
  expect(ports.fullFile).toHaveBeenCalledTimes(1)
  expect(ports.tracks[0]!.play).not.toHaveBeenCalled()
  const requests = ports.request.mock.calls.length
  page.getComponent({ name: 'scene-audio-player' }).vm.$emit('toggle')
  expect(ports.tracks[0]!.src).toBe('wxfile://full.mp3')
  expect(ports.tracks[0]!.play).toHaveBeenCalledTimes(1)
  expect(ports.request).toHaveBeenCalledTimes(requests)
  expect(ports.media).toHaveBeenCalledTimes(1)
  ports.unload?.()
  expect(ports.fullRelease).toHaveBeenCalledTimes(1)
  page.unmount()
})

it('streams immediately when clicked during a slow full download and rejects its late file', async () => {
  let finish!: (value: { src: string; release: () => void }) => void
  const cancelled = vi.fn()
  ports.fullFile.mockImplementationOnce((_url, task) => {
    task.onCancel(cancelled)
    return new Promise((resolve) => {
      finish = resolve
    })
  })
  const page = await open()
  page.getComponent({ name: 'scene-audio-player' }).vm.$emit('toggle')
  expect(cancelled).toHaveBeenCalledTimes(1)
  expect(ports.tracks[0]!.src).toBe('/api/mini/v1/media/full-ticket')
  expect(ports.tracks[0]!.play).toHaveBeenCalledTimes(1)
  finish({ src: 'wxfile://late-full', release: ports.fullRelease })
  await flushPromises()
  expect(ports.fullRelease).toHaveBeenCalledTimes(1)
  expect(ports.tracks[0]!.src).toBe('/api/mini/v1/media/full-ticket')
  ports.unload?.()
  page.unmount()
})

it('cleans audio and files on hide, rebuilds on return, and unsubscribes on unload', async () => {
  const page = await open()
  ports.hide?.()
  expect(ports.release).toHaveBeenCalledTimes(2)
  expect(ports.fullRelease).toHaveBeenCalledTimes(1)
  expect(ports.tracks.every((track) => track.destroy.mock.calls.length === 1)).toBe(true)
  ports.show?.()
  await flushPromises()
  expect(ports.file).toHaveBeenCalledTimes(4)
  ports.unload?.()
  expect(ports.unsubscribe).toHaveBeenCalledTimes(1)
  page.unmount()
})

it('does not start late scene preparation while hidden, and prepares it when shown again', async () => {
  let finish!: (value: ReturnType<typeof scene>) => void
  ports.request.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  const page = await open()
  ports.hide?.()
  finish(scene())
  await flushPromises()
  expect(ports.file).not.toHaveBeenCalled()
  expect(ports.tracks).toHaveLength(0)
  ports.show?.()
  await flushPromises()
  expect(ports.file).toHaveBeenCalledTimes(2)
  ports.unload?.()
  page.unmount()
})

it('disposes cached local audio when the authenticated session expires', async () => {
  const page = await open()
  ports.expired?.()
  expect(ports.release).toHaveBeenCalledTimes(2)
  expect(ports.tracks.every((track) => track.destroy.mock.calls.length === 1)).toBe(true)
  ports.unload?.()
  page.unmount()
})

it('does not reuse a cached local file after another session logs into the same account', async () => {
  const page = await open()
  ports.account!.profile = { id: 'learner' }
  await flushPromises()
  expect(ports.release).toHaveBeenCalledTimes(2)
  expect(ports.tracks.every((track) => track.destroy.mock.calls.length === 1)).toBe(true)
  ports.unload?.()
  page.unmount()
})

it('discards prepared audio after the server reports a changed publication', async () => {
  const { ApiError } = await import('@/services/errors')
  const page = await open()
  ports.request.mockRejectedValueOnce(new ApiError('version_changed', '内容已变化', 409))
  ports.show?.()
  await flushPromises()
  expect(ports.release).toHaveBeenCalledTimes(2)
  expect(page.text()).toContain('内容已更新')
  ports.unload?.()
  page.unmount()
})
