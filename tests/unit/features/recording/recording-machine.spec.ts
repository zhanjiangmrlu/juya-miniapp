import { describe, expect, it, vi } from 'vitest'

import { RecordingController, type RecordingPort } from '@/features/recording/recording-controller'

import type { RecordingPlaybackEventType } from '@/shared/enums/recording'

/** 创建端口替身，permission 为设备是否允许录音 */
const createPort = (permission = true): RecordingPort => {
  return {
    deleteFile: vi.fn(async () => undefined),
    playback: vi.fn(async () => undefined),
    requestPermission: vi.fn(async () => permission),
    start: vi.fn(async () => undefined),
    stop: vi.fn(async () => 'recording.aac'),
    stopPlayback: vi.fn()
  }
}

describe('RecordingController', () => {
  it('再次录音等待设备启动时不会并发回听旧录音', async () => {
    const port = createPort()
    const controller = new RecordingController(port)
    await controller.selectSentence('sentence-1')
    await controller.start()
    await controller.stop()
    let resolve!: () => void
    port.start = vi.fn(
      () =>
        new Promise<void>((done) => {
          resolve = done
        })
    )
    const starting = controller.start()
    await vi.waitFor(() => expect(resolve).toBeTypeOf('function'))
    await controller.playback()
    resolve()
    await starting
    expect(port.playback).not.toHaveBeenCalled()
    expect(controller.snapshot.status).toBe('RECORDING')
  })
  it('重复停止同一次录音仍会保留文件并进入可回听状态', async () => {
    const port = createPort()
    let finish!: (path: string) => void
    port.stop = () =>
      new Promise((resolve) => {
        finish = resolve
      })
    const controller = new RecordingController(port)
    await controller.selectSentence('sentence-1')
    await controller.start()
    const first = controller.stop()
    const second = controller.stop()
    finish('saved.aac')
    await Promise.all([first, second])
    expect(controller.snapshot).toMatchObject({ status: 'RECORDED', hasRecording: true })
    await controller.playback()
    expect(port.playback).toHaveBeenCalledWith('saved.aac')
  })
  it('等待麦克风授权时停止会取消录音意图', async () => {
    const port = createPort()
    let allow!: (allowed: boolean) => void
    port.requestPermission = () =>
      new Promise((resolve) => {
        allow = resolve
      })
    const controller = new RecordingController(port)
    await controller.selectSentence('sentence-1')
    const starting = controller.start()
    await Promise.resolve()
    await controller.stop()
    allow(true)
    await starting
    expect(port.start).not.toHaveBeenCalled()
    expect(controller.snapshot.status).toBe('IDLE')
  })

  it('设备启动等待期间重复点击不会并发启动录音', async () => {
    const port = createPort()
    const starts: (() => void)[] = []
    port.start = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          starts.push(resolve)
        })
    )
    const controller = new RecordingController(port)
    await controller.selectSentence('sentence-1')
    const first = controller.start()
    await vi.waitFor(() => expect(port.start).toHaveBeenCalledOnce())
    const second = controller.start()
    await Promise.resolve()
    await Promise.resolve()
    starts.forEach((resolve) => resolve())
    await Promise.all([first, second])
    expect(port.start).toHaveBeenCalledOnce()
    expect(controller.snapshot.status).toBe('RECORDING')
  })

  it('退出会等待迟到的设备启动停止并删除文件后销毁端口', async () => {
    const port = createPort()
    let started!: () => void
    port.start = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          started = resolve
        })
    )
    port.destroy = vi.fn()
    const controller = new RecordingController(port)
    await controller.selectSentence('sentence-1')
    const starting = controller.start()
    await vi.waitFor(() => expect(port.start).toHaveBeenCalledOnce())
    const disposing = controller.dispose()
    for (let turn = 0; turn < 5; turn++) await Promise.resolve()
    expect(port.destroy).not.toHaveBeenCalled()
    started()
    await Promise.all([starting, disposing])
    expect(port.stop).toHaveBeenCalledOnce()
    expect(port.deleteFile).toHaveBeenCalledWith('recording.aac')
    expect(port.destroy).toHaveBeenCalledOnce()
    expect(controller.snapshot.status).toBe('IDLE')
  })

  it('重录等待删除旧文件期间切句不会替新句启动录音', async () => {
    const port = createPort()
    const controller = new RecordingController(port)
    await controller.selectSentence('sentence-1')
    await controller.start()
    await controller.stop()
    let deleted!: () => void
    port.deleteFile = () =>
      new Promise<void>((resolve) => {
        deleted = resolve
      })
    const rerecording = controller.rerecord()
    await vi.waitFor(() => expect(deleted).toBeTypeOf('function'))
    await controller.selectSentence('sentence-2')
    deleted()
    await rerecording
    expect(port.start).toHaveBeenCalledOnce()
    expect(controller.snapshot).toMatchObject({ selectedSentenceId: 'sentence-2', status: 'IDLE' })
  })

  it('旧句停止失败不会把新句标成失败', async () => {
    const port = createPort()
    let reject!: (error: Error) => void
    port.stop = () =>
      new Promise((_resolve, fail) => {
        reject = fail
      })
    const controller = new RecordingController(port)
    await controller.selectSentence('sentence-1')
    await controller.start()
    const selecting = controller.selectSentence('sentence-2')
    reject(new Error('旧设备停止失败'))
    await selecting
    expect(controller.snapshot).toMatchObject({ selectedSentenceId: 'sentence-2', status: 'IDLE' })
  })
  it('录音权限未返回时重复点击只请求一次麦克风', async () => {
    const port = createPort()
    let resolve!: (allowed: boolean) => void
    port.requestPermission = vi.fn(
      () =>
        new Promise<boolean>((done) => {
          resolve = done
        })
    )
    const controller = new RecordingController(port)
    await controller.selectSentence('sentence-1')
    const first = controller.start()
    const second = controller.start()
    await Promise.resolve()
    expect(port.requestPermission).toHaveBeenCalledOnce()
    resolve(true)
    await Promise.all([first, second])
    expect(port.start).toHaveBeenCalledOnce()
  })
  it('设备到时自动停止会保留当前句录音并允许回听', async () => {
    const port = createPort()
    let listener!: (path?: string) => void
    port.subscribeRecording = (next) => {
      listener = next
      return vi.fn()
    }
    const controller = new RecordingController(port)
    await controller.selectSentence('sentence-1')
    await controller.start()
    listener('automatic.aac')
    expect(controller.snapshot.status).toBe('RECORDED')
    await controller.playback()
    expect(port.playback).toHaveBeenCalledWith('automatic.aac')
  })
  it('停止回听后迟到的 pause 事件不覆盖新录音状态', async () => {
    const port = createPort()
    let listener!: (type: RecordingPlaybackEventType) => void
    port.subscribePlayback = (next) => {
      listener = next
      return vi.fn()
    }
    const controller = new RecordingController(port)
    await controller.selectSentence('sentence-1')
    await controller.start()
    listener('pause')
    expect(controller.snapshot.status).toBe('RECORDING')
  })
  it('退出时停止正在录制的设备并删除停止后返回的文件', async () => {
    const port = createPort()
    const controller = new RecordingController(port)
    controller.selectSentence('sentence-1')
    await controller.start()
    await controller.dispose()
    expect(port.stop).toHaveBeenCalledOnce()
    expect(port.deleteFile).toHaveBeenCalledWith('recording.aac')
  })

  it('切句停止旧录音后不会把旧文件记到新句', async () => {
    let resolve!: (path: string) => void
    const port = createPort()
    port.stop = () =>
      new Promise((done) => {
        resolve = done
      })
    const controller = new RecordingController(port)
    controller.selectSentence('sentence-1')
    await controller.start()
    const selecting = controller.selectSentence('sentence-2')
    resolve('old.aac')
    await selecting
    expect(controller.snapshot.selectedSentenceId).toBe('sentence-2')
    expect(controller.snapshot.status).toBe('IDLE')
    await controller.playback()
    expect(port.playback).not.toHaveBeenCalled()
  })
  it('任意句可开始且首次只请求一次录音权限', async () => {
    const port = createPort()
    const controller = new RecordingController(port)

    controller.selectSentence('sentence-3')
    await controller.start()
    await controller.stop()
    controller.selectSentence('sentence-1')
    await controller.start()

    expect(port.requestPermission).toHaveBeenCalledOnce()
    expect(port.start).toHaveBeenLastCalledWith('sentence-1')
  })

  it('权限拒绝只禁用录音功能', async () => {
    const controller = new RecordingController(createPort(false))
    controller.selectSentence('sentence-1')

    await controller.start()

    expect(controller.snapshot).toMatchObject({ recordingDisabled: true, status: 'DENIED' })
  })

  it('切句停止回听，重录删除旧文件', async () => {
    const port = createPort()
    const controller = new RecordingController(port)
    controller.selectSentence('sentence-1')
    await controller.start()
    await controller.stop()
    await controller.playback()

    controller.selectSentence('sentence-2')
    controller.selectSentence('sentence-1')
    await controller.rerecord()

    expect(port.stopPlayback).toHaveBeenCalled()
    expect(port.deleteFile).toHaveBeenCalledWith('recording.aac')
  })

  it.each(['页面卸载', '完成学习', '后台超时', '退出登录'])('%s 均清理临时录音文件', async () => {
    const port = createPort()
    const controller = new RecordingController(port)
    controller.selectSentence('sentence-1')
    await controller.start()
    await controller.stop()

    await controller.dispose()

    expect(port.deleteFile).toHaveBeenCalledWith('recording.aac')
    expect(controller.snapshot.status).toBe('IDLE')
  })
})
