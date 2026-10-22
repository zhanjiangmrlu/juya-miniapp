import { expect, it, vi } from 'vitest'

import { readingPositionAt, restoreReadingOffset } from '@/features/learning/reading-position'
import { createReadingPositionWriter } from '@/services/reading-position'

const blocks = [
  { anchor: 'top', top: 100, height: 400 },
  { anchor: 'dialogue:line-1', top: 550, height: 100 },
  { anchor: 'vocabulary:word-1', top: 700, height: 200 }
]

it('records a validated visible content anchor and relative progress instead of a device-specific pixel offset', () => {
  expect(readingPositionAt(blocks, 650, 88, 'version-1')).toEqual({
    version_id: 'version-1',
    anchor: 'vocabulary:word-1',
    progress: 0.19
  })
  expect(readingPositionAt(blocks, 0, 88, 'version-1')).toEqual({
    version_id: 'version-1',
    anchor: 'top',
    progress: 0
  })
})

it('restores the same semantic block on a different layout and never guesses an anchor from another version', () => {
  const position = { version_id: 'version-1', anchor: 'dialogue:line-1', progress: 0.5 }
  expect(
    restoreReadingOffset(
      position,
      [{ anchor: 'dialogue:line-1', top: 900, height: 200 }],
      88,
      'version-1'
    )
  ).toBe(912)
  expect(restoreReadingOffset(position, blocks, 88, 'version-2')).toBe(null)
  expect(
    restoreReadingOffset({ ...position, anchor: 'dialogue:deleted' }, blocks, 88, 'version-1')
  ).toBe(null)
})

it('coalesces hide and unload saves and sends only the current account position', async () => {
  let finish: () => void = () => undefined
  const run = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve
      })
  )
  const writer = createReadingPositionWriter({
    userId: () => 'owner',
    run,
    pending: () => false,
    recover: vi.fn()
  })
  const position = { version_id: 'v1', anchor: 'dialogue:line-1', progress: 0.25 }
  const first = writer.save('card', position)
  const second = writer.save('card', position)
  expect(run).toHaveBeenCalledTimes(1)
  finish()
  await Promise.all([first, second])
  await writer.save('card', position)
  expect(run).toHaveBeenCalledTimes(1)
})
