import { afterEach, expect, it, vi } from 'vitest'

import { downloadWordAudio } from '@/services/word-audio-file'

/** 模拟页面销毁时可撤销的下载任务 */
const cancellation = () => {
  let alive = true
  const listeners = new Set<() => void>()
  return {
    task: {
      active: () => alive,
      onCancel: (callback: () => void) => {
        listeners.add(callback)
        return () => listeners.delete(callback)
      }
    },
    cancel: () => {
      alive = false
      for (const listener of listeners) listener()
    }
  }
}
afterEach(() => vi.unstubAllGlobals())

it('downloads only a complete successful response and deletes its temporary file once', async () => {
  const unlink = vi.fn()
  vi.stubGlobal('uni', {
    env: { USER_DATA_PATH: 'wxfile://usr' },
    downloadFile: vi.fn((options) => {
      expect(options.filePath).toMatch(/^wxfile:\/\/usr\/juya-word-audio-/)
      options.success({
        statusCode: 200,
        tempFilePath: options.filePath,
        filePath: options.filePath
      })
      return { abort: vi.fn() }
    }),
    getFileSystemManager: () => ({
      unlink,
      readFileSync: () => new Uint8Array([0x49, 0x44, 0x33, 0, 0, 0, 0, 0, 0, 0, 0, 0]).buffer,
      renameSync: vi.fn()
    })
  })
  const { task } = cancellation()
  const result = await downloadWordAudio(
    'https://api.example/api/mini/v1/pronunciation/ticket',
    task
  )
  expect(result.src).toMatch(/^wxfile:\/\/usr\/juya-word-audio-/)
  result.release()
  result.release()
  expect(unlink).toHaveBeenCalledTimes(1)
  expect(unlink.mock.calls[0]![0].filePath).toBe(result.src)
})

it('aborts an active native download and cleans up a successful callback arriving after cancellation', async () => {
  let succeed!: (result: { statusCode: number; tempFilePath: string }) => void
  let path = ''
  const abort = vi.fn(),
    unlink = vi.fn()
  vi.stubGlobal('uni', {
    env: { USER_DATA_PATH: 'wxfile://usr' },
    downloadFile: vi.fn((options) => {
      succeed = options.success
      path = options.filePath
      return { abort }
    }),
    getFileSystemManager: () => ({ unlink })
  })
  const { task, cancel } = cancellation()
  const pending = downloadWordAudio('https://api.example/audio', task)
  const failed = expect(pending).rejects.toThrow('试听已取消')
  cancel()
  await failed
  expect(abort).toHaveBeenCalledTimes(1)
  succeed({ statusCode: 200, tempFilePath: path })
  expect(unlink.mock.calls.at(-1)![0].filePath).toBe(path)
})

it('rejects non-audio HTTP errors and removes the downloaded error document', async () => {
  const unlink = vi.fn()
  vi.stubGlobal('uni', {
    env: { USER_DATA_PATH: 'wxfile://usr' },
    downloadFile: vi.fn((options) => {
      options.success({ statusCode: 410, tempFilePath: 'wxfile://error.json' })
      return { abort: vi.fn() }
    }),
    getFileSystemManager: () => ({ unlink })
  })
  await expect(
    downloadWordAudio('https://api.example/audio', cancellation().task)
  ).rejects.toMatchObject({ status: 410 })
  expect(unlink).toHaveBeenCalledTimes(1)
})

it('removes only expired owned audio after a previous interrupted session', async () => {
  const unlink = vi.fn(),
    now = Date.now()
  const old = `juya-word-audio-${now - 240001}-old`,
    recent = `juya-word-audio-${now}-active`
  vi.stubGlobal('uni', {
    env: { USER_DATA_PATH: 'wxfile://usr' },
    getFileSystemManager: () => ({
      unlink,
      readFileSync: () => new Uint8Array([0x49, 0x44, 0x33, 0, 0, 0, 0, 0, 0, 0, 0, 0]).buffer,
      renameSync: vi.fn(),
      readdir: (options: { success: (value: { files: string[] }) => void }) =>
        options.success({ files: [old, recent, 'other-file', 'juya-word-audio-invalid-file'] })
    }),
    downloadFile: vi.fn((options) => {
      options.success({ statusCode: 200, tempFilePath: options.filePath })
      return { abort: vi.fn() }
    })
  })
  const file = await downloadWordAudio('https://api.example/audio', cancellation().task)
  expect(unlink).toHaveBeenCalledTimes(1)
  expect(unlink.mock.calls[0]![0].filePath).toBe(`wxfile://usr/${old}`)
  file.release()
})
