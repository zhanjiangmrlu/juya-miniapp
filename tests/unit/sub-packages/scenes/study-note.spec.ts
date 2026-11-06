import { expect, it, vi } from 'vitest'

import { createStudyNote } from '@/sub-packages/scenes/study-note'

/** 创建仅含当前笔记元数据的受控详情
 * @param version 当前已发布笔记独立版本
 */
const scene = (version = 'note-v1') => ({
  card_id: 'card',
  version_id: 'body',
  study_note: {
    version_id: version,
    media_id: 'pdf',
    filename: '笔记.pdf',
    size: 1,
    state: 'ready'
  }
})
/** 建立真实状态机和可控平台边界 */
const setup = () => {
  let owner: string | null = 'owner'
  const request = vi
      .fn()
      .mockImplementation(async (path: string) =>
        path.includes('/url?')
          ? { url: '/api/mini/v1/resource', expires_at: '2099-01-01' }
          : scene()
      ),
    file = { path: '/tmp/owner-card-note-v1.pdf', release: vi.fn() },
    download = vi.fn(async () => file),
    open = vi.fn(async () => undefined),
    pause = vi.fn(),
    accept = vi.fn(),
    ensure = vi.fn(async () => true)
  const note = createStudyNote({
    userId: () => owner,
    context: () => ({ cardId: 'card', bodyVersion: 'body' }),
    ensure,
    request,
    resource: (url: string) => url,
    pause,
    accept,
    download,
    open,
    invalid: vi.fn()
  })
  return {
    note,
    request,
    file,
    download,
    open,
    pause,
    accept,
    ensure,
    changeOwner: () => {
      owner = 'other'
    }
  }
}
it('single-flights fresh detail and independent PDF ticket then holds audio until native hide/show', async () => {
  const { note, request, download, open, pause, file } = setup()
  await Promise.all([note.open(), note.open()])
  expect(request.mock.calls.map(([path]) => path)).toEqual([
    '/api/mini/v1/cards/card?mark_started=false',
    '/api/mini/v1/cards/card/media/pdf/url?purpose=study_note&study_note_version_id=note-v1',
    '/api/mini/v1/cards/card?mark_started=false'
  ])
  expect(download).toHaveBeenCalledOnce()
  expect(open).toHaveBeenCalledWith(file.path)
  expect(pause).toHaveBeenCalledOnce()
  expect(note.locked.value).toBe(true)
  expect(file.release).not.toHaveBeenCalled()
  expect(note.show()).toBe(false)
  expect(note.locked.value).toBe(true)
  expect(note.hide()).toBe(true)
  expect(note.show()).toBe(true)
  expect(note.locked.value).toBe(false)
  expect(file.release).toHaveBeenCalledOnce()
  await note.open()
  expect(request).toHaveBeenCalledTimes(6)
})
it('distinguishes download from native opening failures and revalidates every retry', async () => {
  const { note, download, open, request } = setup()
  download.mockRejectedValueOnce(new Error('网络中断'))
  await note.open()
  expect(note.error.value).toContain('下载失败')
  expect(note.error.value).toContain('网络中断')
  expect(note.locked.value).toBe(false)
  open.mockRejectedValueOnce(new Error('平台无法预览'))
  await note.open()
  expect(note.error.value).toContain('打开失败')
  expect(request).toHaveBeenCalledTimes(5)
  expect(note.locked.value).toBe(false)
})
it('discards late downloads after account changes and releases their private files', async () => {
  const { note, download, open, file, changeOwner } = setup()
  let finish!: (value: typeof file) => void
  download.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  const pending = note.open()
  await vi.waitFor(() => expect(download).toHaveBeenCalled())
  changeOwner()
  finish(file)
  await pending
  expect(open).not.toHaveBeenCalled()
  expect(file.release).toHaveBeenCalledOnce()
  expect(note.error.value).toBe('')
})
it('refreshes a removed PDF without requesting an old ticket or opening a file', async () => {
  const { note, request, accept, download } = setup()
  request.mockResolvedValueOnce({ ...scene(), study_note: null })
  await note.open()
  expect(accept).toHaveBeenCalledWith(expect.objectContaining({ study_note: null }))
  expect(note.error.value).toContain('暂无可用学习笔记')
  expect(download).not.toHaveBeenCalled()
})

it('treats a document download interrupted by app hiding as a read-only return', async () => {
  const { note, download } = setup()
  download.mockImplementationOnce(() => new Promise(() => undefined))
  void note.open()
  await vi.waitFor(() => expect(download).toHaveBeenCalled())
  expect(note.hide()).toBe(true)
  expect(note.show()).toBe(true)
  expect(note.locked.value).toBe(false)
})

it.each(['revoked', 'replaced', 'removed'])(
  'revalidates the server after downloading and never opens a %s PDF',
  async (change) => {
    const { note, request, open, file, accept } = setup()
    request.mockReset()
    request
      .mockResolvedValueOnce(scene())
      .mockResolvedValueOnce({ url: '/api/mini/v1/resource', expires_at: '2099-01-01' })
    if (change === 'revoked') request.mockRejectedValueOnce(new Error('学习授权已撤销'))
    else
      request.mockResolvedValueOnce(
        change === 'removed' ? { ...scene(), study_note: null } : scene('note-v2')
      )
    await note.open()
    expect(open).not.toHaveBeenCalled()
    expect(file.release).toHaveBeenCalledOnce()
    expect(request.mock.calls.at(-1)?.[0]).toBe('/api/mini/v1/cards/card?mark_started=false')
    if (change === 'removed')
      expect(accept).toHaveBeenLastCalledWith(expect.objectContaining({ study_note: null }))
  }
)

it('refreshes an updated body through a read-only port so retry can open the new body PDF', async () => {
  let body = 'body'
  const request = vi
    .fn()
    .mockImplementation(async (path: string) =>
      path.includes('/url?')
        ? { url: '/api/mini/v1/resource', expires_at: '2099-01-01' }
        : { ...scene(), version_id: 'body-v2' }
    )
  const refreshBody = vi.fn(async () => {
      body = 'body-v2'
    }),
    nativeOpen = vi.fn(async () => undefined)
  const note = createStudyNote({
    userId: () => 'owner',
    context: () => ({ cardId: 'card', bodyVersion: body }),
    ensure: async () => true,
    request,
    resource: (url) => url,
    pause: vi.fn(),
    accept: vi.fn(),
    download: async () => ({ path: '/tmp/new.pdf', release: vi.fn() }),
    open: nativeOpen,
    invalid: vi.fn(),
    refreshBody
  } as Parameters<typeof createStudyNote>[0] & { refreshBody: () => Promise<void> })
  await note.open()
  expect(refreshBody).toHaveBeenCalledOnce()
  expect(nativeOpen).not.toHaveBeenCalled()
  await note.open()
  expect(nativeOpen).toHaveBeenCalledWith('/tmp/new.pdf')
  expect(
    request.mock.calls
      .filter(([path]) => !path.includes('/url?'))
      .every(([path]) => path.includes('mark_started=false'))
  ).toBe(true)
})

/** 暂缓某轮服务端最终校验，控制成功和拒绝的返回顺序 */
const deferred = <T>() => {
  let resolve!: (value: T) => void, reject!: (reason: unknown) => void
  const promise = new Promise<T>((done, fail) => {
    resolve = done
    reject = fail
  })
  return { promise, resolve, reject }
}

it.each([
  ['success', 'verifying'],
  ['rejection', 'verifying'],
  ['success', 'native'],
  ['rejection', 'native']
])('keeps B ownership after A late %s while B is %s', async (outcome, stage) => {
  const { note, request, download, open } = setup(),
    a = deferred<ReturnType<typeof scene>>(),
    b = deferred<ReturnType<typeof scene>>()
  const fileA = { path: '/tmp/A.pdf', release: vi.fn() },
    fileB = { path: '/tmp/B.pdf', release: vi.fn() }
  request.mockReset()
  request
    .mockResolvedValueOnce(scene())
    .mockResolvedValueOnce({ url: '/api/mini/v1/A' })
    .mockReturnValueOnce(a.promise)
    .mockResolvedValueOnce(scene())
    .mockResolvedValueOnce({ url: '/api/mini/v1/B' })
    .mockReturnValueOnce(b.promise)
  download.mockResolvedValueOnce(fileA).mockResolvedValueOnce(fileB)
  const first = note.open()
  await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(3))
  note.hide()
  note.show()
  const second = note.open()
  await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(6))
  if (stage === 'native') {
    b.resolve(scene())
    await second
  }
  if (outcome === 'success') a.resolve(scene())
  else a.reject(new Error('A迟到网络错误'))
  await first
  expect(fileB.release).not.toHaveBeenCalled()
  expect(note.locked.value).toBe(true)
  expect(note.busy.value).toBe(stage === 'verifying')
  expect(note.error.value).toBe('')
  if (stage === 'verifying') {
    b.resolve(scene())
    await second
  }
  expect(open).toHaveBeenCalledExactlyOnceWith(fileB.path)
  expect(fileB.release).not.toHaveBeenCalled()
  expect(note.error.value).toBe('')
  note.hide()
  note.show()
  expect(fileB.release).toHaveBeenCalledOnce()
})
