import { describe, expect, it, vi } from 'vitest'

import { RecordingController, type RecordingPort } from './recording-controller'

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
    let listener!: (type: 'play' | 'pause' | 'ended' | 'error') => void
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
