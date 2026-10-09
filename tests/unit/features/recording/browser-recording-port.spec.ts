import { afterEach, describe, expect, it, vi } from 'vitest'

import { createBrowserRecordingPort } from '@/features/recording/browser-recording-port'

describe('H5 本地录音端口', () => {
  afterEach(() => vi.unstubAllGlobals())
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
