import { beforeEach, expect, it, vi } from 'vitest'

import { createAppUpdateCoordinator } from '@/services/app-update'

import type { AppUpdatePlatform } from '@/shared/types/app-update'

let ready: () => void, failed: () => void
const applyUpdate = vi.fn()
const modals: Parameters<AppUpdatePlatform['showModal']>[0][] = []
const platform: AppUpdatePlatform = {
  getUpdateManager: vi.fn(() => ({
    onUpdateReady: vi.fn((callback) => {
      ready = callback
    }),
    onUpdateFailed: vi.fn((callback) => {
      failed = callback
    }),
    applyUpdate
  })),
  showModal: (options) => {
    modals.push(options)
  }
}
beforeEach(() => {
  modals.length = 0
  vi.clearAllMocks()
})
it('registers once and prompts only after the update is ready in the foreground', () => {
  const updates = createAppUpdateCoordinator(platform)
  updates.launch()
  updates.launch()
  updates.show()
  expect(platform.getUpdateManager).toHaveBeenCalledOnce()
  expect(modals).toHaveLength(0)
  ready()
  ready()
  expect(modals).toHaveLength(1)
  expect(modals[0]).toMatchObject({
    title: '更新提示',
    confirmText: '立即更新',
    cancelText: '稍后'
  })
  expect(applyUpdate).not.toHaveBeenCalled()
  modals[0]!.success?.({ confirm: true, cancel: false })
  expect(applyUpdate).toHaveBeenCalledOnce()
})
it('re-prompts a cancelled ready update on the next foreground entry without duplicate modals', () => {
  const updates = createAppUpdateCoordinator(platform)
  updates.launch()
  updates.show()
  ready()
  modals[0]!.success?.({ confirm: false, cancel: true })
  modals[0]!.complete?.()
  ready()
  expect(modals).toHaveLength(1)
  updates.hide()
  updates.show()
  expect(modals).toHaveLength(2)
  expect(applyUpdate).not.toHaveBeenCalled()
})
it('defers readiness and download failures in the background until entering again', () => {
  const updates = createAppUpdateCoordinator(platform)
  updates.launch()
  updates.show()
  updates.hide()
  failed()
  expect(modals).toHaveLength(0)
  updates.show()
  expect(modals[0]?.content).toBe('更新下载失败，请检查网络后重新进入小程序')
  modals[0]!.complete?.()
  updates.hide()
  ready()
  updates.show()
  expect(modals).toHaveLength(2)
  modals[1]!.success?.({ confirm: true, cancel: false })
  expect(applyUpdate).toHaveBeenCalledOnce()
})
it('does not repeat an update prompt if the previous modal is still open across entries', () => {
  const updates = createAppUpdateCoordinator(platform)
  updates.launch()
  updates.show()
  ready()
  updates.hide()
  updates.show()
  expect(modals).toHaveLength(1)
  modals[0]!.success?.({ confirm: false, cancel: true })
  modals[0]!.complete?.()
  ready()
  expect(modals).toHaveLength(1)
})
it('does not prevent launch when the platform API is unavailable or throws', () => {
  for (const getUpdateManager of [
    undefined,
    () => {
      throw new Error('unsupported')
    }
  ]) {
    const updates = createAppUpdateCoordinator({ ...platform, getUpdateManager })
    expect(() => {
      updates.launch()
      updates.show()
      updates.hide()
    }).not.toThrow()
    expect(modals).toHaveLength(0)
  }
})
