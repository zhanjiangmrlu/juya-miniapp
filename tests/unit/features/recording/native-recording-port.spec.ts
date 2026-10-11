import { afterEach, describe, expect, it, vi } from 'vitest'

import { createNativeRecordingPort } from '@/features/recording/native-recording-port'

/** 创建微信单例录音管理器替身，保留真实接口的追加监听语义 */
const prepareDevice = () => {
  const started: (() => void)[] = []
  const stopped: ((result: { tempFilePath: string }) => void)[] = []
  const failed: ((error: Error) => void)[] = []
  const recorder = {
    onStart: vi.fn((next) => started.push(next)),
    onStop: vi.fn((next) => stopped.push(next)),
    onError: vi.fn((next) => failed.push(next)),
    start: vi.fn(() => started.forEach((next) => next())),
    stop: vi.fn(() => stopped.forEach((next) => next({ tempFilePath: 'local.aac' })))
  }
  const playback = {
    destroy: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    play: vi.fn(),
    onPlay: vi.fn(),
    onPause: vi.fn(),
    onEnded: vi.fn(),
    onError: vi.fn()
  }
  const unlink = vi.fn(({ success }: { success: () => void }) => success())
  vi.stubGlobal('uni', {
    getRecorderManager: () => recorder,
    createInnerAudioContext: () => playback,
    getFileSystemManager: () => ({ unlink })
  })
  return {
    recorder,
    playback,
    unlink,
    completeStop: () => stopped.forEach((next) => next({ tempFilePath: 'late.aac' })),
    completeStart: () => started.forEach((next) => next()),
    error: () => failed.forEach((next) => next(new Error('device error')))
  }
}

afterEach(() => vi.unstubAllGlobals())

describe('微信本地录音端口生命周期', () => {
  it('销毁后的迟到开始事件会停止设备并删除文件', async () => {
    const { recorder, unlink, completeStart } = prepareDevice()
    const port = createNativeRecordingPort()
    recorder.start.mockImplementationOnce(() => undefined)
    const starting = port.start('s1').catch((error) => error)
    port.destroy?.()
    completeStart()
    expect(await starting).toBeInstanceOf(Error)
    expect(recorder.stop).toHaveBeenCalledOnce()
    expect(unlink).toHaveBeenCalledWith(expect.objectContaining({ filePath: 'local.aac' }))
  })
  it('销毁仍在录音的设备会停止并删除迟到停止文件', async () => {
    const { recorder, unlink, completeStop } = prepareDevice()
    const port = createNativeRecordingPort()
    await port.start('s1')
    recorder.stop.mockImplementationOnce(() => undefined)
    port.destroy?.()
    completeStop()
    expect(recorder.stop).toHaveBeenCalledOnce()
    expect(unlink).toHaveBeenCalledWith(expect.objectContaining({ filePath: 'late.aac' }))
  })
  it('启动同步异常后可以再次开始录音', async () => {
    const { recorder } = prepareDevice()
    const port = createNativeRecordingPort()
    recorder.start.mockImplementationOnce(() => {
      throw new Error('start unavailable')
    })
    await expect(port.start('s1')).rejects.toThrow('start unavailable')
    await port.start('s1')
    expect(recorder.start).toHaveBeenCalledTimes(2)
    await port.stop()
    port.destroy?.()
  })
  it('停止同步异常后仍可再次停止并拿到临时文件', async () => {
    const { recorder } = prepareDevice()
    const port = createNativeRecordingPort()
    await port.start('s1')
    recorder.stop.mockImplementationOnce(() => {
      throw new Error('stop unavailable')
    })
    await expect(port.stop()).rejects.toThrow('stop unavailable')
    expect(await port.stop()).toBe('local.aac')
    port.destroy?.()
  })
  it('反复进入跟读只为单例管理器注册一组设备桥接监听', () => {
    const { recorder } = prepareDevice()
    for (let count = 0; count < 5; count++) createNativeRecordingPort().destroy?.()
    expect(recorder.onStart).toHaveBeenCalledOnce()
    expect(recorder.onStop).toHaveBeenCalledOnce()
    expect(recorder.onError).toHaveBeenCalledOnce()
  })
  it('启动失败后再次录音的设备错误仍通知控制器', async () => {
    const { recorder, error } = prepareDevice()
    const port = createNativeRecordingPort()
    const listener = vi.fn()
    port.subscribeRecording?.(listener)
    recorder.start.mockImplementationOnce(() => error())
    await expect(port.start('s1')).rejects.toThrow('device error')
    await port.start('s1')
    error()
    expect(listener).toHaveBeenCalledExactlyOnceWith()
    port.destroy?.()
  })
  it('未开始录音的端口不接收其他会话的自动停止文件', async () => {
    const { recorder } = prepareDevice()
    const idle = createNativeRecordingPort()
    const active = createNativeRecordingPort()
    const listener = vi.fn()
    idle.subscribeRecording?.(listener)
    await active.start('s1')
    recorder.stop()
    expect(listener).not.toHaveBeenCalled()
    idle.destroy?.()
    active.destroy?.()
  })
  it('停止失败后再次录音的设备错误不会被旧拒绝回调吞掉', async () => {
    const { recorder, error } = prepareDevice()
    const port = createNativeRecordingPort()
    const listener = vi.fn()
    port.subscribeRecording?.(listener)
    await port.start('s1')
    recorder.stop.mockImplementationOnce(() => error())
    await expect(port.stop()).rejects.toThrow('device error')
    await port.start('s1')
    error()
    expect(listener).toHaveBeenCalledExactlyOnceWith()
    port.destroy?.()
  })
  it('销毁后不接受新的设备启动或回听请求', async () => {
    const { recorder, playback } = prepareDevice()
    const port = createNativeRecordingPort()
    port.destroy?.()
    await expect(port.start('s1')).rejects.toThrow()
    await expect(port.playback('local.aac')).rejects.toThrow()
    expect(recorder.start).not.toHaveBeenCalled()
    expect(playback.play).not.toHaveBeenCalled()
  })
})
