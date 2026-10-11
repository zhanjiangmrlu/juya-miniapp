// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import { ref } from 'vue'

import { createSceneModel } from '@/features/scene/scene-model'
import { createSceneService } from '@/features/scene/scene-service'
import { createHttpClient } from '@/services/http/client'
import Shadowing from '@/sub-packages/scene/shadowing.vue'

import type { components } from '../fixtures/contracts/v15-a9a97b8/provider'
import type { TransportRequest } from '@/shared/types/http'
import type { FullSceneModel } from '@/shared/types/scene'
import type { VueWrapper } from '@vue/test-utils'

import openapi from '../fixtures/contracts/v15-a9a97b8/openapi.json'

const dependencies = vi.hoisted(() => ({
  load: undefined as ((query?: Record<string, string>) => Promise<void>) | undefined,
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
  }
}))
vi.mock('@dcloudio/uni-app', () => ({
  onLoad: (next: typeof dependencies.load) => {
    dependencies.load = next
  },
  onHide: (next: typeof dependencies.hide) => {
    dependencies.hide = next
  },
  onShow: vi.fn(),
  onUnload: vi.fn()
}))
vi.mock('@/services/analytics/use-analytics-page', () => ({ useAnalyticsPage: vi.fn() }))
vi.mock('@/shared/navigation/navigate', () => ({ navigate: dependencies.navigate }))
vi.mock('@/features/recording/recording-controller', async (original) => ({
  ...(await original<object>()),
  createUniRecordingPort: () => dependencies.port
}))

const fullModel = ref<FullSceneModel>()
const sceneId = ref('recording-scene')
vi.mock('@/features/scene/use-scene-page', () => ({
  useScenePage: () => ({
    audio: { stop: vi.fn(), snapshot: { status: 'IDLE' }, currentKey: null },
    initialize: dependencies.initialize,
    complete: dependencies.complete,
    play: dependencies.play,
    disposeAudio: vi.fn(),
    fullModel,
    sceneId,
    scene: {
      get dialogueEntries() {
        return fullModel.value?.entries.filter((entry) => entry.entry_type === 'DIALOGUE') ?? []
      }
    }
  })
}))

/** 使用已发布生成类型构造同版详情，enabled为权威录音开关 */
const createWire = (enabled: boolean): components['schemas']['SceneOpenResult'] => ({
  access: 'OPEN',
  authorization_pending: false,
  sources: ['OPEN'],
  activated_at: null,
  earliest_expires_at: null,
  scene: {
    recording_enabled: enabled,
    content_id: 'recording-scene',
    content_type: 'dialogue',
    content_version: 3,
    revision_id: 'revision-3',
    schema_version: 2,
    title_en: 'Local practice',
    title_zh: '本地跟读',
    dialogue: [
      {
        sentence_id: 's1',
        speaker: 'Ivy',
        english: 'First sentence.',
        chinese: '第一句。',
        position: 1,
        start_ms: 0,
        end_ms: 1000,
        slice_target_id: 'slice-1',
        slice_version: 'slice-version-1'
      },
      {
        sentence_id: 's2',
        speaker: 'Ivy',
        english: 'Second sentence.',
        chinese: '第二句。',
        position: 2,
        start_ms: 1000,
        end_ms: 2000,
        slice_target_id: 'slice-2',
        slice_version: 'slice-version-2'
      }
    ],
    words: [],
    chunks: [],
    whole_audio: { target_id: 'whole-3', resource_version: 'whole-version-3', duration_ms: 2000 }
  }
})

let wire = createWire(false)
const requests: TransportRequest[] = []
// 仅在内存返回提供方契约，设备与传输替身不代表真实HTTP或微信验收
const service = createSceneService(
  createHttpClient({
    baseUrl: 'https://contract.example.test',
    clientVersion: '1.5',
    session: {
      getAccessToken: () => 'fixture-token',
      refresh: async () => undefined,
      clear: vi.fn()
    },
    transport: {
      request: async <T>(request: TransportRequest) => {
        requests.push(request)
        const url = new URL(request.url)
        const data: unknown = url.pathname.endsWith('/open')
          ? wire
          : url.pathname.endsWith('/signed-url')
            ? ({
                resource_id: 'slice-2',
                url: 'https://media.example.test/slice-2',
                expires_at: '2099-01-01T00:00:00Z'
              } satisfies components['schemas']['SignedResource'])
            : { completed: true }
        return { status: 200, headers: {}, data: data as T }
      }
    }
  })
)
let wrapper: VueWrapper | undefined

/** 将真实服务adapter输出送入M14，enabled为本次提供方录音开关 */
const render = async (enabled: boolean) => {
  wire = createWire(enabled)
  wrapper = mount(Shadowing, {
    global: { stubs: { ScenePageLayout: { template: '<div><slot /></div>' } } }
  })
  await dependencies.load?.({ sceneId: 'recording-scene' })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  vi.resetAllMocks()
  requests.length = 0
  fullModel.value = undefined
  dependencies.port.requestPermission.mockResolvedValue(true)
  dependencies.port.stop.mockResolvedValue('local.aac')
  dependencies.initialize.mockImplementation(async (id: string) => {
    sceneId.value = id
    const model = createSceneModel(await service.open(id))
    if (model.kind !== 'FULL') throw new Error('Expected authorized scene')
    fullModel.value = model
  })
  dependencies.play.mockImplementation((target) => service.getSignedUrl(target))
  dependencies.complete.mockImplementation(async () => {
    await service.complete(sceneId.value, 'fixture-complete-key')
    return true
  })
})
afterEach(async () => {
  dependencies.hide?.()
  await flushPromises()
  wrapper?.unmount()
  wrapper = undefined
})

describe('BFF a9a97b8录音开关生成契约消费者', () => {
  it('已发布SceneDetail使用布尔开关且默认关闭，发音对外仍只有四态', () => {
    expectTypeOf<
      components['schemas']['SceneDetail']['recording_enabled']
    >().toEqualTypeOf<boolean>()
    expectTypeOf<components['schemas']['PronunciationResponse']['status']>().toEqualTypeOf<
      'READY' | 'PREPARING' | 'FAILED' | 'UNAVAILABLE'
    >()
    expect(openapi.components.schemas.SceneDetail.properties.recording_enabled).toMatchObject({
      type: 'boolean',
      default: false
    })
  })
  it.each([false, true])(
    '录音开关%s由adapter送到M14，仍可读全部句子、选句、播放切片并完成',
    async (enabled) => {
      const page = await render(enabled)
      expect(fullModel.value?.recording_enabled).toBe(enabled)
      const rows = page.findAll('.dialogue-sentence')
      expect(rows.map((row) => row.find('.sentence-text').text())).toEqual([
        'First sentence.',
        'Second sentence.'
      ])
      await rows[1].trigger('click')
      await flushPromises()
      expect(page.find('.dialogue-sentence.selected .sentence-text').text()).toBe(
        'Second sentence.'
      )
      expect(page.find('.recording-top').text()).toContain('当前句 2 / 2')
      const original = page.get('.recording-top .audio-button.inline')
      expect(original.attributes('disabled')).toBeUndefined()
      await original.trigger('click')
      await flushPromises()
      expect(requests.at(-1)).toMatchObject({ method: 'GET', body: undefined })
      expect(requests.at(-1)?.url).toBe(
        'https://contract.example.test/api/v1/scenes/recording-scene/resources/slice-2/signed-url?revision_id=revision-3'
      )
      const start = page
        .findAll('.recording-action')
        .find((button) => button.text().includes('开始录音'))!
      expect(start.attributes('disabled') !== undefined).toBe(!enabled)
      await start.trigger('click')
      await flushPromises()
      if (enabled) {
        expect(dependencies.port.requestPermission).toHaveBeenCalledOnce()
        expect(dependencies.port.start).toHaveBeenCalledWith('s2')
        await page.findAll('.recording-action')[1].trigger('click')
        await flushPromises()
        expect(page.text()).toContain('当次回听')
      } else {
        expect(dependencies.port.requestPermission).not.toHaveBeenCalled()
        expect(dependencies.port.start).not.toHaveBeenCalled()
        expect(page.find('.recording-hint').text()).toContain('录音暂未开放')
      }
      const complete = page.get('.scene-actions .scene-action.secondary')
      expect(complete.attributes('disabled')).toBeUndefined()
      await complete.trigger('click')
      await flushPromises()
      expect(requests.at(-1)).toMatchObject({
        method: 'POST',
        url: 'https://contract.example.test/api/v1/scenes/recording-scene/complete',
        body: undefined
      })
      expect(dependencies.navigate).toHaveBeenCalledWith({
        type: 'redirectTo',
        url: '/sub-packages/scene/completed?sceneId=recording-scene'
      })
      expect(dependencies.port.destroy).toHaveBeenCalledOnce()
      if (enabled) expect(dependencies.port.deleteFile).toHaveBeenCalledWith('local.aac')
    }
  )
  it('已发布开关关闭会取消等待授权的录音，保留当前句与原音入口', async () => {
    const page = await render(true)
    let allow!: (permission: boolean) => void
    dependencies.port.requestPermission.mockImplementationOnce(
      () =>
        new Promise<boolean>((resolve) => {
          allow = resolve
        })
    )
    await page.findAll('.recording-action')[0].trigger('click')
    await flushPromises()
    wire = createWire(false)
    await dependencies.initialize('recording-scene')
    await flushPromises()
    allow(true)
    await flushPromises()
    expect(dependencies.port.start).not.toHaveBeenCalled()
    expect(page.findAll('.recording-action')[0].attributes('disabled')).toBeDefined()
    expect(page.find('.recording-top').text()).toContain('当前句 1 / 2')
    expect(page.get('.recording-top .audio-button.inline').attributes('disabled')).toBeUndefined()
    expect(
      page.get('.scene-actions .scene-action.secondary').attributes('disabled')
    ).toBeUndefined()
  })
})
