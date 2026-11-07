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
