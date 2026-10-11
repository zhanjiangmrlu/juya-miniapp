import { afterEach, describe, expect, it, vi } from 'vitest'

import { createBrowserRecordingPort } from '@/features/recording/browser-recording-port'

describe('H5 本地录音端口', () => {
  /** 创建可手动发送设备错误和停止回调的浏览器端口替身 */
  const prepareDevice = () => {
    const track = { stop: vi.fn() }
    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia: async () => ({ getTracks: () => [track] }) }
    })
    class Recorder {
      static current: Recorder
      state = 'inactive'
      ondataavailable?: (event: { data: Blob }) => void
      onstop?: () => void
      onerror?: (error: Error) => void
      constructor() {
        Recorder.current = this
      }
      start = () => {
        this.state = 'recording'
      }
      stop = () => {
        this.state = 'inactive'
      }
    }
    vi.stubGlobal('MediaRecorder', Recorder)
    vi.stubGlobal(
      'Audio',
      class {
        src = ''
        pause = vi.fn()
        addEventListener = vi.fn()
      }
    )
    return { Recorder, track }
  }
  afterEach(() => vi.unstubAllGlobals())
  it('录音中设备错误会通知失败，迟到停止不产生可回听文件', async () => {
    const { Recorder } = prepareDevice()
    const port = createBrowserRecordingPort()
    const failed = vi.fn()
    port.subscribeRecording?.(failed)
    await port.requestPermission()
    await port.start('s1')
    const create = vi.spyOn(URL, 'createObjectURL')
    Recorder.current.onerror?.(new Error('device error'))
    Recorder.current.ondataavailable?.({ data: new Blob(['partial']) })
    Recorder.current.onstop?.()
    expect(failed).toHaveBeenCalledExactlyOnceWith()
    expect(create).not.toHaveBeenCalled()
    port.destroy?.()
    create.mockRestore()
  })
  it('等待设备停止时销毁端口不会创建迟到对象 URL', async () => {
    const { Recorder } = prepareDevice()
    const port = createBrowserRecordingPort()
    await port.requestPermission()
    await port.start('s1')
    const stopping = port.stop().catch((error) => error)
    const create = vi.spyOn(URL, 'createObjectURL')
    port.destroy?.()
    Recorder.current.ondataavailable?.({ data: new Blob(['late']) })
    Recorder.current.onstop?.()
    expect(await stopping).toBeInstanceOf(Error)
    expect(create).not.toHaveBeenCalled()
    create.mockRestore()
  })
  it('设备没有录到任何字节时停止返回失败', async () => {
    const { Recorder } = prepareDevice()
    const port = createBrowserRecordingPort()
    await port.requestPermission()
    await port.start('s1')
    const stopping = port.stop().catch((error) => error)
    Recorder.current.onstop?.()
    expect(await stopping).toBeInstanceOf(Error)
    port.destroy?.()
  })
  it('设备停止同步异常不会阻止销毁释放麦克风', async () => {
    const { Recorder, track } = prepareDevice()
    const port = createBrowserRecordingPort()
    await port.requestPermission()
    await port.start('s1')
    Recorder.current.stop = () => {
      throw new Error('stop unavailable')
    }
    await expect(port.stop()).rejects.toThrow()
    port.destroy?.()
    expect(track.stop).toHaveBeenCalledOnce()
  })
  it('权限请求在销毁后返回时立即释放迟到的麦克风', async () => {
    const track = { stop: vi.fn() }
    let resolve!: (stream: unknown) => void
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: () =>
          new Promise((done) => {
            resolve = done
          })
      }
    })
    vi.stubGlobal('MediaRecorder', class {})
    vi.stubGlobal(
      'Audio',
      class {
        src = ''
        pause = vi.fn()
        addEventListener = vi.fn()
      }
    )
    const port = createBrowserRecordingPort()
    const permission = port.requestPermission()
    port.destroy?.()
    resolve({ getTracks: () => [track] })
    expect(await permission).toBe(false)
    expect(track.stop).toHaveBeenCalledOnce()
  })
  it('申请权限、停止获取临时 blob，退出停止麦克风并撤销对象 URL', async () => {
    const track = { stop: vi.fn() }
    const stream = { getTracks: () => [track] }
    const getUserMedia = vi.fn(async () => stream)
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } })
    class Recorder {
      state = 'inactive'
      ondataavailable?: (event: { data: Blob }) => void
      onstop?: () => void
      static isTypeSupported = () => true
      start = () => {
        this.state = 'recording'
      }
      stop = () => {
        this.state = 'inactive'
        this.ondataavailable?.({ data: new Blob(['voice']) })
        this.onstop?.()
      }
    }
    vi.stubGlobal('MediaRecorder', Recorder)
    vi.stubGlobal(
      'Audio',
      class {
        src = ''
        pause = vi.fn()
        play = vi.fn(async () => undefined)
        addEventListener = vi.fn()
        removeEventListener = vi.fn()
      }
    )
    const revoke = vi.spyOn(URL, 'revokeObjectURL')
    const port = createBrowserRecordingPort()
    expect(await port.requestPermission()).toBe(true)
    await port.start('sentence-3')
    const path = await port.stop()
    expect(path.startsWith('blob:')).toBe(true)
    await port.start('sentence-4')
    const second = await port.stop()
    expect(second).not.toBe(path)
    await port.deleteFile(second)
    await port.deleteFile(path)
    port.destroy?.()
    expect(track.stop).toHaveBeenCalledOnce()
    expect(revoke).toHaveBeenCalledWith(path)
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true })
  })
})
