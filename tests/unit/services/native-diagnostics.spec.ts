import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.resetModules()
})

it('does not send diagnostic traffic in ordinary builds', async () => {
  vi.stubEnv('VITE_NATIVE_DIAGNOSTICS', '')
  const request = vi.fn()
  vi.stubGlobal('uni', { request })
  const { recordNativeDiagnostic } = await import('@/services/native-diagnostics')
  recordNativeDiagnostic('native-play', { rate: 1 })
  expect(request).not.toHaveBeenCalled()
})

it('batches bounded white-listed events without forwarding arbitrary native error strings or resource fields', async () => {
  vi.useFakeTimers()
  vi.stubEnv('VITE_NATIVE_DIAGNOSTICS', 'true')
  vi.stubEnv('VITE_NATIVE_DIAGNOSTICS_ENDPOINT', 'http://fixture.invalid/_qa/native-diagnostics')
  const request = vi.fn()
  vi.stubGlobal('uni', { request })
  const { recordNativeDiagnostic, nativeErrorFields } =
    await import('@/services/native-diagnostics')
  for (let i = 0; i < 1000; i++)
    recordNativeDiagnostic('native-play', {
      rate: 1.5,
      ...nativeErrorFields({
        errMsg: 'image load fail https://private.test/path?grant=secret /private/file token=secret',
        errCode: 10002
      }),
      url: 'secret'
    } as never)
  await vi.advanceTimersByTimeAsync(20000)
  expect(request.mock.calls.length).toBeGreaterThan(0)
  expect(request.mock.calls.length).toBeLessThanOrEqual(10)
  const events = request.mock.calls.flatMap(([options]) => options.data)
  expect(events.length).toBeLessThanOrEqual(300)
  expect(events[0]).toMatchObject({
    seq: 1,
    event: 'native-play',
    rate: 1.5,
    errCode: 10002,
    error: 'image,load,fail'
  })
  expect(JSON.stringify(events)).not.toMatch(/secret|private|grant|token|url/)
})

it('compares the direct and downloaded thumbnail decoder boundaries without publishing their paths', async () => {
  vi.useFakeTimers()
  vi.stubEnv('VITE_NATIVE_DIAGNOSTICS', 'true')
  vi.stubEnv('VITE_NATIVE_DIAGNOSTICS_ENDPOINT', 'http://fixture.invalid/_qa/native-diagnostics')
  const request = vi.fn()
  vi.stubGlobal('uni', {
    request,
    getImageInfo: (options: UniApp.GetImageInfoOptions) =>
      options.src.startsWith('http')
        ? options.fail?.({ errMsg: 'image load fail' })
        : options.success?.({
            width: 144,
            height: 216,
            path: '/private/temp',
            type: 'webp',
            orientation: 'up'
          }),
    downloadFile: (options: UniApp.DownloadFileOption) =>
      options.success?.({ statusCode: 200, tempFilePath: '/private/temp' } as never),
    getFileSystemManager: () => ({ unlink: vi.fn() })
  })
  const { probeNativeImage } = await import('@/services/native-diagnostics')
  probeNativeImage('http://private.test/image?grant=secret', 'list')
  await vi.advanceTimersByTimeAsync(1000)
  const events = request.mock.calls.flatMap(([options]) => options.data)
  expect(events).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ event: 'image-info', surface: 'list', local: false, ok: false }),
      expect.objectContaining({ event: 'image-download', status: 200 }),
      expect.objectContaining({
        event: 'image-info',
        local: true,
        ok: true,
        width: 144,
        height: 216
      })
    ])
  )
  expect(JSON.stringify(events)).not.toMatch(/secret|private|grant/)
})

it('retains safe pause lifecycle fields and rejects unknown labels', async () => {
  vi.useFakeTimers()
  vi.stubEnv('VITE_NATIVE_DIAGNOSTICS', 'true')
  vi.stubEnv('VITE_NATIVE_DIAGNOSTICS_ENDPOINT', 'http://fixture.invalid/_qa/native-diagnostics')
  const request = vi.fn()
  vi.stubGlobal('uni', { request })
  const { recordNativeDiagnostic } = await import('@/services/native-diagnostics')
  recordNativeDiagnostic('controller-state', {
    port: 2,
    controller: 3,
    operation: 'toggle',
    phase: 'before',
    audioStatus: 'playing',
    fullIntent: true,
    fullStarting: false,
    ratePausing: false,
    rateRebinding: false,
    pendingRate: null,
    active: true,
    branch: 'forward',
    secret: 'private'
  } as never)
  recordNativeDiagnostic('controller-state', {
    operation: 'secret',
    audioStatus: 'private',
    phase: 'secret'
  } as never)
  await vi.advanceTimersByTimeAsync(500)
  const events = request.mock.calls.flatMap(([options]) => options.data)
  expect(events[0]).toMatchObject({
    event: 'controller-state',
    port: 2,
    controller: 3,
    operation: 'toggle',
    phase: 'before',
    audioStatus: 'playing',
    fullIntent: true,
    pendingRate: null
  })
  expect(JSON.stringify(events)).not.toMatch(/secret|private/)
})

it('correlates controller pause intent with its exact background port and actual forwarded native pause', async () => {
  vi.useFakeTimers()
  vi.stubEnv('VITE_NATIVE_DIAGNOSTICS', 'true')
  vi.stubEnv('VITE_NATIVE_DIAGNOSTICS_ENDPOINT', 'http://fixture.invalid/_qa/native-diagnostics')
  const request = vi.fn(),
    callbacks: Record<string, () => void> = {}
  vi.stubGlobal('uni', { request })
  const [{ createAudioController }, { createBackgroundAudioPort }] = await Promise.all([
    import('@/services/audio-controller'),
    import('@/services/background-audio-port')
  ])
  let source = ''
  const native = {
    title: '',
    startTime: 0,
    currentTime: 0,
    duration: 60,
    playbackRate: 1,
    paused: true,
    get src() {
      return source
    },
    set src(value: string) {
      source = value
      native.play()
    },
    play: () => {
      native.paused = false
      callbacks.play?.()
    },
    pause: () => {
      native.paused = true
      callbacks.pause?.()
    },
    stop: () => {
      native.paused = true
      callbacks.stop?.()
    },
    seek: () => {},
    onPlay: (cb: (result: unknown) => void) => {
      callbacks.play = () => cb(undefined)
    },
    onPause: (cb: (result: unknown) => void) => {
      callbacks.pause = () => cb(undefined)
    },
    onStop: (cb: (result: unknown) => void) => {
      callbacks.stop = () => cb(undefined)
    },
    onEnded: () => {},
    onTimeUpdate: (cb: (result: unknown) => void) => {
      callbacks.time = () => cb(undefined)
    },
    onError: () => {}
  }
  const full = createBackgroundAudioPort(native, {
    title: '音频',
    resume: async () => {},
    leave: () => {}
  })
  const word = {
    ...full,
    play: () => {},
    pause: () => {},
    stop: () => {},
    destroy: () => {},
    onPlay: () => {},
    onPause: () => {},
    onEnded: () => {},
    onTimeUpdate: () => {},
    onError: () => {}
  }
  const controller = createAudioController(full, word, () => {}, { rate: 1 })
  await controller.toggleFull(() => '/full')
  for (let index = 0; index < 100; index++) {
    native.currentTime += 0.1
    callbacks.time?.()
  }
  await controller.toggleFull(() => '/unused')
  await vi.advanceTimersByTimeAsync(1000)
  const events = request.mock.calls.flatMap(([options]) => options.data)
  expect(events.filter((event) => event.operation === 'notify')).toHaveLength(3)
  const created = events.find(
    (event) => event.event === 'controller-state' && event.operation === 'create'
  )
  expect(created).toMatchObject({ controller: 1, port: 1 })
  expect(events).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        event: 'controller-state',
        controller: 1,
        port: 1,
        operation: 'toggle',
        phase: 'before',
        fullIntent: true,
        audioStatus: 'playing'
      }),
      expect.objectContaining({
        event: 'port-state',
        port: 1,
        operation: 'native-pause',
        phase: 'before',
        branch: 'forward',
        guardPaused: true,
        active: true
      }),
      expect.objectContaining({
        event: 'controller-state',
        controller: 1,
        port: 1,
        operation: 'native-pause',
        phase: 'after',
        fullIntent: false,
        audioStatus: 'paused'
      })
    ])
  )
  expect(controller.state.status).toBe('paused')
  controller.dispose()
})
