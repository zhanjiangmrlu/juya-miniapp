import { describe, expect, it, vi } from 'vitest'

import { RecordingController, type RecordingPort } from './recording-controller'

/** 创建录音端口替身，验证权限、文件和回听资源生命周期。 */
function createPort(permission = true): RecordingPort {
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
