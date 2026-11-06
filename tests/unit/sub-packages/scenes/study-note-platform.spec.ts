import { beforeEach, expect, it, vi } from 'vitest'

import { downloadStudyNote, openStudyNoteDocument } from '@/sub-packages/scenes/study-note-platform'

let cancelled = () => undefined as void
let callback: UniApp.DownloadFileOption | undefined
const unlink = vi.fn(),
  abort = vi.fn()
beforeEach(() => {
  vi.clearAllMocks()
  cancelled = () => undefined
  vi.stubGlobal('uni', {
    env: { USER_DATA_PATH: 'wxfile://private' },
    getStorageSync: () => ({ access_token: 'mini_isolated', user_id: 'owner' }),
    getFileSystemManager: () => ({ unlink }),
    downloadFile: vi.fn((options: UniApp.DownloadFileOption) => {
      callback = options
      return { abort }
    }),
    openDocument: vi.fn((options: UniApp.OpenDocumentOptions) => {
      options.success?.({ errMsg: 'openDocument:ok' })
      options.complete?.({ errMsg: 'openDocument:ok' })
    })
  })
})
it('authenticates a fresh isolated PDF and sends the native PDF type without treating complete as closure', async () => {
  const pending = downloadStudyNote('/api/mini/v1/ticket', '[owner,card,note-v1]', {
    active: () => true,
    onCancel: (cb) => {
      cancelled = cb
      return () => undefined
    }
  })
  const path = callback!.filePath!
  expect(path).toMatch(/^wxfile:\/\/private\/study-note-.*\.pdf$/)
  expect(callback!.header).toEqual({ Authorization: 'Bearer mini_isolated' })
  callback!.success?.({ statusCode: 200, tempFilePath: path, errMsg: 'ok' })
  const file = await pending
  await openStudyNoteDocument(file.path)
  expect(uni.openDocument).toHaveBeenCalledWith(
    expect.objectContaining({ filePath: path, fileType: 'pdf', showMenu: false })
  )
  expect(unlink).not.toHaveBeenCalled()
  file.release()
  expect(unlink).toHaveBeenCalledOnce()
})
it('cleans a cancelled native download again when the platform creates its file after abort', async () => {
  const pending = downloadStudyNote('/api/mini/v1/ticket', '[owner,card,note-v1]', {
    active: () => true,
    onCancel: (cb) => {
      cancelled = cb
      return () => undefined
    }
  })
  cancelled()
  await expect(pending).rejects.toThrow('取消')
  callback!.success?.({ statusCode: 200, tempFilePath: callback!.filePath!, errMsg: 'ok' })
  expect(abort).toHaveBeenCalledOnce()
  expect(unlink).toHaveBeenCalledTimes(2)
})

it('sweeps only owned orphan PDFs and protects both active downloads and open documents', async () => {
  const dir = uni.env.USER_DATA_PATH
  const entries = [
    'study-note-ab-1700000000000-abc123.pdf',
    'study-note-export.pdf',
    'foreign.pdf',
    '../study-note-ab-1700000000000-z.pdf'
  ]
  const fs = { unlink, unlinkSync: vi.fn(), readdirSync: vi.fn(() => entries) }
  Object.assign(uni, { getFileSystemManager: () => fs })
  const task = { active: () => true, onCancel: () => () => undefined }
  const first = downloadStudyNote('/ticket', 'open', task)
  const firstPath = callback!.filePath!
  callback!.success?.({ statusCode: 200, tempFilePath: firstPath, errMsg: 'ok' })
  const opened = await first
  entries.push(firstPath.slice(dir.length + 1))
  const second = downloadStudyNote('/ticket', 'active', task)
  const secondCallback = callback!
  entries.push(secondCallback.filePath!.slice(dir.length + 1))
  const third = downloadStudyNote('/ticket', 'third', task)
  expect(fs.readdirSync).toHaveBeenCalledWith(dir)
  expect(fs.unlinkSync.mock.calls).toContainEqual([dir + '/' + entries[0]])
  expect(fs.unlinkSync.mock.calls.every(([path]) => path === dir + '/' + entries[0])).toBe(true)
  for (const call of [secondCallback, callback!])
    call.success?.({ statusCode: 200, tempFilePath: call.filePath!, errMsg: 'ok' })
  for (const file of [opened, await second, await third]) file.release()
})
