// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import Shadowing from './shadowing.vue'

const dependencies = vi.hoisted(() => ({
  load: undefined as ((query?: Record<string, string>) => Promise<void>) | undefined,
  show: undefined as (() => Promise<void>) | undefined,
  hide: undefined as (() => void) | undefined,
  initialize: vi.fn(),
  play: vi.fn(),
  complete: vi.fn(),
  navigate: vi.fn(),
  port: {
    start: vi.fn(),
    stop: vi.fn(),
    stopPlayback: vi.fn(),
    deleteFile: vi.fn(),
    requestPermission: vi.fn(),
    playback: vi.fn(),
    destroy: vi.fn()
  },
  createPort: vi.fn()
}))
vi.mock('@dcloudio/uni-app', () => ({
  onLoad: (callback: typeof dependencies.load) => {
    dependencies.load = callback
  },
  onShow: (callback: typeof dependencies.show) => {
    dependencies.show = callback
  },
  onHide: (callback: typeof dependencies.hide) => {
    dependencies.hide = callback
  },
  onUnload: vi.fn()
}))
vi.mock('@/features/recording/recording-controller', async (original) => ({
  ...(await original<object>()),
  createUniRecordingPort: dependencies.createPort
}))
const entries = ['s1', 's2', 's3'].map((id) => ({
  entry_id: id,
  source_locator: id,
  text: id,
  entry_type: 'DIALOGUE',
  audio: { target_id: 'audio', version_id: 'v1', sentence_id: id, target_type: 'SCENE' }
}))
vi.mock('@/features/scene/use-scene-page', () => ({
  useScenePage: () => ({
    audio: { stop: vi.fn(), snapshot: { status: 'IDLE' }, currentKey: null },
    complete: dependencies.complete,
    disposeAudio: vi.fn(),
    fullModel: ref({ chineseTitle: '场景' }),
    initialize: dependencies.initialize,
    play: dependencies.play,
    scene: { dialogueEntries: entries },
    sceneId: ref('coffee')
  })
}))
vi.mock('@/shared/navigation/navigate', () => ({ navigate: dependencies.navigate }))
const options = {
  global: {
    stubs: {
      ScenePageLayout: { template: '<div><slot /></div>' },
      DialogueSentence: true,
      RecordingControls: true
    }
  }
}
beforeEach(() => {
  vi.resetAllMocks()
  dependencies.createPort.mockReturnValue(dependencies.port)
  dependencies.port.requestPermission.mockResolvedValue(true)
  dependencies.port.stop.mockResolvedValue('local.aac')
})
describe('跟读页异步操作生命周期', () => {
  it('完成清理期间点击句子不会取消成果跳转', async () => {
    const wrapper = mount(Shadowing, options)
    await dependencies.load?.({ sceneId: 'coffee' })
    wrapper.findComponent({ name: 'RecordingControls' }).vm.$emit('start')
    await flushPromises()
    let resolve!: (path: string) => void
    dependencies.port.stop.mockImplementationOnce(
      () =>
        new Promise<string>((done) => {
          resolve = done
        })
    )
    dependencies.complete.mockResolvedValue(true)
    await wrapper.find('.scene-action').trigger('click')
    await flushPromises()
    wrapper.findAllComponents({ name: 'DialogueSentence' })[2].vm.$emit('select', entries[2])
    resolve('completed.aac')
    await flushPromises()
    expect(dependencies.navigate).toHaveBeenCalledWith({
      type: 'redirectTo',
      url: '/sub-packages/scene/completed?sceneId=coffee'
    })
    dependencies.hide?.()
    wrapper.unmount()
  })
  it('重复点击完成不会取消第一次成功后的成果跳转', async () => {
    let resolve!: (completed: boolean) => void
    dependencies.complete.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done
        })
    )
    dependencies.complete.mockResolvedValue(false)
    const wrapper = mount(Shadowing, options)
    await dependencies.load?.({ sceneId: 'coffee' })
    const button = wrapper.find('.scene-action')
    await button.trigger('click')
    await button.trigger('click')
    resolve(true)
    await flushPromises()
    expect(dependencies.navigate).toHaveBeenCalledWith({
      type: 'redirectTo',
      url: '/sub-packages/scene/completed?sceneId=coffee'
    })
    expect(dependencies.complete).toHaveBeenCalledOnce()
    dependencies.hide?.()
    wrapper.unmount()
  })
  it('首次加载期间隐藏再返回会重新创建当前页面录音端口', async () => {
    let resolve!: () => void
    dependencies.initialize.mockImplementationOnce(
      () =>
        new Promise<void>((done) => {
          resolve = done
        })
    )
    const wrapper = mount(Shadowing, options)
    const loading = dependencies.load?.({ sceneId: 'coffee' })
    dependencies.hide?.()
    await dependencies.show?.()
    resolve()
    await loading
    expect(dependencies.createPort).toHaveBeenCalledOnce()
    dependencies.hide?.()
    wrapper.unmount()
  })
  it('加载场景期间隐藏页面不会创建迟到的录音端口', async () => {
    let resolve!: () => void
    dependencies.initialize.mockImplementationOnce(
      () =>
        new Promise<void>((done) => {
          resolve = done
        })
    )
    const wrapper = mount(Shadowing, options)
    const loading = dependencies.load?.({ sceneId: 'coffee' })
    dependencies.hide?.()
    resolve()
    await loading
    expect(dependencies.createPort).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('原音等待停止录音时退出不会迟到启动播放器', async () => {
    const wrapper = mount(Shadowing, options)
    await dependencies.load?.({ sceneId: 'coffee' })
    wrapper.findComponent({ name: 'RecordingControls' }).vm.$emit('start')
    await flushPromises()
    let resolve!: (path: string) => void
    dependencies.port.stop.mockImplementationOnce(
      () =>
        new Promise<string>((done) => {
          resolve = done
        })
    )
    wrapper.findComponent({ name: 'RecordingControls' }).vm.$emit('playOriginal')
    await flushPromises()
    dependencies.hide?.()
    resolve('late.aac')
    await flushPromises()
    expect(dependencies.play).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('原音等待停止录音时切到第三句不会再播放第二句', async () => {
    const wrapper = mount(Shadowing, options)
    await dependencies.load?.({ sceneId: 'coffee' })
    wrapper.findComponent({ name: 'RecordingControls' }).vm.$emit('start')
    await flushPromises()
    let resolve!: (path: string) => void
    dependencies.port.stop.mockImplementationOnce(
      () =>
        new Promise<string>((done) => {
          resolve = done
        })
    )
    const rows = wrapper.findAllComponents({ name: 'DialogueSentence' })
    rows[1].vm.$emit('play', entries[1].audio)
    await flushPromises()
    rows[2].vm.$emit('select', entries[2])
    resolve('late.aac')
    await flushPromises()
    expect(dependencies.play).not.toHaveBeenCalled()
    dependencies.hide?.()
    wrapper.unmount()
  })
})
